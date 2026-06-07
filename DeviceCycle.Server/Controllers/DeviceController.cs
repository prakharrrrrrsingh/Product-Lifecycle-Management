using DeviceCycle.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace DeviceCycle.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DevicesController : ControllerBase
{
    private readonly DeviceRegistrationLifecycleContext _context;

    public DevicesController(DeviceRegistrationLifecycleContext context)
    {
        _context = context;
    }

    // GET /api/devices or GET /api/devices?status=active
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<DeviceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DeviceDto>>> GetDevices([FromQuery] string? status)
    {
        var devices = await _context.Devices
            .Where(d => status == null || d.Status == status)
            .Select(d => ToDto(d))
            .ToListAsync();

        return Ok(devices);
    }

    // GET /api/devices/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeviceDto>> GetDevice(int id)
    {
        var device = await _context.Devices.FindAsync(id);
        if (device is null)
            return NotFound(new { message = $"Device with id {id} not found." });

        return Ok(ToDto(device));
    }

    // POST /api/devices — Admin only
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DeviceDto>> CreateDevice([FromBody] CreateDeviceRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool serialExists = await _context.Devices
            .AnyAsync(d => d.SerialNumber == request.SerialNumber);

        if (serialExists)
            return Conflict(new { message = $"A device with serial number '{request.SerialNumber}' already exists." });

        var now = DateTime.UtcNow;

        var device = new Device
        {
            SerialNumber = request.SerialNumber,
            Model = request.Model,
            Status = request.Status,
            FirmwareVersion = request.FirmwareVersion,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Devices.Add(device);
        // Save first so EF populates device.Id before using it in the change log
        await _context.SaveChangesAsync();

        _context.ChangeLogs.Add(new ChangeLog
        {
            DeviceId = device.Id,
            Action = "CREATED",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, ToDto(device));
    }

    // PUT /api/devices/{id} — Admin only
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DeviceDto>> UpdateDevice(int id, [FromBody] UpdateDeviceRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var device = await _context.Devices.FindAsync(id);
        if (device is null)
            return NotFound(new { message = $"Device with id {id} not found." });

        var now = DateTime.UtcNow;
        var changeEntries = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.SerialNumber) &&
            request.SerialNumber != device.SerialNumber)
        {
            bool serialTaken = await _context.Devices
                .AnyAsync(d => d.SerialNumber == request.SerialNumber && d.Id != id);

            if (serialTaken)
                return Conflict(new { message = $"Serial number '{request.SerialNumber}' is already used by another device." });

            changeEntries.Add($"SERIAL_CHANGED: {device.SerialNumber} → → {request.SerialNumber}");
            device.SerialNumber = request.SerialNumber;
        }

        if (request.Model is not null && request.Model != device.Model)
        {
            changeEntries.Add($"MODEL_CHANGED: {device.Model ?? "(none) "} → {request.Model}");
            device.Model = request.Model;
        }

        if (request.Status is not null && request.Status != device.Status)
        {
            changeEntries.Add($"STATUS_CHANGED: {device.Status} → {request.Status}");
            device.Status = request.Status;
        }

        if (request.FirmwareVersion is not null && request.FirmwareVersion != device.FirmwareVersion)
        {
            string oldFw = device.FirmwareVersion ?? "(none)";
            changeEntries.Add($"FIRMWARE_UPGRADED: {oldFw} → {request.FirmwareVersion}");
            device.FirmwareVersion = request.FirmwareVersion;
        }

        // If nothing changed, still log a generic update
        if (changeEntries.Count == 0)
            changeEntries.Add("UPDATED");

        device.UpdatedAt = now;

        foreach (var entry in changeEntries)
        {
            _context.ChangeLogs.Add(new ChangeLog
            {
                DeviceId = device.Id,
                Action = entry,
                CreatedAt = now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(ToDto(device));
    }

    // DELETE /api/devices/{id} — Admin only
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDevice(int id)
    {
        var device = await _context.Devices
            .Include(d => d.ChangeLogs)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (device is null)
            return NotFound(new { message = $"Device with id {id} not found." });

        var serialNumber = device.SerialNumber;
        var model = device.Model ?? "N/A";
        var now = DateTime.UtcNow;

        _context.ChangeLogs.RemoveRange(device.ChangeLogs);
        _context.Devices.Remove(device);
        await _context.SaveChangesAsync();

        // Keep a tombstone log entry (DeviceId = null) so deletions still appear in audit trail
        _context.ChangeLogs.Add(new ChangeLog
        {
            DeviceId = null,
            SerialNumber = serialNumber,
            Action = $"DELETED: {serialNumber} (Model: {model})",
            CreatedAt = now
        });
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/devices/outdated
    [HttpGet("outdated")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<OutdatedDeviceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<OutdatedDeviceDto>>> GetOutdatedDevices()
    {
        var latestFirmware = await _context.FirmwareVersions
            .OrderByDescending(f => f.Id)
            .FirstOrDefaultAsync();

        if (latestFirmware is null)
            return NotFound(new { message = "No firmware versions found in the system." });

        var outdated = await _context.Devices
            .Where(d => d.FirmwareVersion != null &&
                        d.FirmwareVersion != latestFirmware.Version)
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => new OutdatedDeviceDto(
                d.Id,
                d.SerialNumber,
                d.Model,
                d.Status,
                d.FirmwareVersion!,
                latestFirmware.Version,
                d.UpdatedAt))
            .ToListAsync();

        return Ok(outdated);
    }

    // GET /api/devices/missing-firmware
    [HttpGet("missing-firmware")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<DeviceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DeviceDto>>> GetMissingFirmwareDevices()
    {
        var devices = await _context.Devices
            .Where(d => d.FirmwareVersion == null || d.FirmwareVersion == string.Empty)
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => ToDto(d))
            .ToListAsync();

        return Ok(devices);
    }

    private static DeviceDto ToDto(Device d) =>
        new(d.Id, d.SerialNumber, d.Model, d.Status, d.FirmwareVersion, d.CreatedAt, d.UpdatedAt);
}

// DTOs
public record DeviceDto(
    int Id,
    string SerialNumber,
    string? Model,
    string Status,
    string? FirmwareVersion,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record OutdatedDeviceDto(
    int Id,
    string SerialNumber,
    string? Model,
    string Status,
    string CurrentFirmware,
    string LatestFirmware,
    DateTime UpdatedAt);

public class CreateDeviceRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.StringLength(100)]
    public string SerialNumber { get; set; } = null!;

    [System.ComponentModel.DataAnnotations.StringLength(100)]
    public string? Model { get; set; }

    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.StringLength(20)]
    public string Status { get; set; } = null!;

    [System.ComponentModel.DataAnnotations.StringLength(50)]
    public string? FirmwareVersion { get; set; }
}

// All fields optional — only non-null values are applied on update
public class UpdateDeviceRequest
{
    [System.ComponentModel.DataAnnotations.StringLength(100)]
    public string? SerialNumber { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(100)]
    public string? Model { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(20)]
    public string? Status { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(50)]
    public string? FirmwareVersion { get; set; }
}
