using DeviceCycle.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace DeviceCycle.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class ChangeLogsController : ControllerBase
{
    private readonly DeviceRegistrationLifecycleContext _context;

    public ChangeLogsController(DeviceRegistrationLifecycleContext context)
    {
        _context = context;
    }

    // GET /api/changelogs/device/{deviceId} — full history for a single device
    [HttpGet("device/{deviceId:int}")]
    [ProducesResponseType(typeof(DeviceHistoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeviceHistoryDto>> GetDeviceHistory(int deviceId)
    {
        var device = await _context.Devices.FindAsync(deviceId);
        if (device is null)
            return NotFound(new { message = $"Device with id {deviceId} not found." });

        var logs = await _context.ChangeLogs
            .Where(c => c.DeviceId == deviceId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ChangeLogEntryDto(c.Id, c.Action, c.CreatedAt))
            .ToListAsync();

        return Ok(new DeviceHistoryDto(
            deviceId,
            device.SerialNumber,
            device.Model,
            device.Status,
            device.FirmwareVersion,
            device.CreatedAt,
            device.UpdatedAt,
            logs));
    }

    // GET /api/changelogs — supports optional filters: deviceId, action, from, to
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChangeLogEntryWithDeviceDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ChangeLogEntryWithDeviceDto>>> GetChangeLogs(
        [FromQuery] int? deviceId,
        [FromQuery] string? action,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        IQueryable<ChangeLog> query = _context.ChangeLogs.Include(c => c.Device);

        if (deviceId.HasValue)
            query = query.Where(c => c.DeviceId == deviceId.Value);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(c => c.Action.Contains(action));

        if (from.HasValue)
            query = query.Where(c => c.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(c => c.CreatedAt <= to.Value);

        var logs = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ChangeLogEntryWithDeviceDto(
                c.Id,
                c.DeviceId,
                // Use tombstone serial for deleted devices, otherwise pull from Device
                c.SerialNumber ?? (c.Device != null ? c.Device.SerialNumber : "Unknown"),
                c.Action,
                c.CreatedAt))
            .ToListAsync();

        return Ok(logs);
    }
}

// DTOs
public record ChangeLogEntryDto(int Id, string Action, DateTime CreatedAt);

// DeviceId is nullable for entries that refer to deleted devices
public record ChangeLogEntryWithDeviceDto(
    int Id,
    int? DeviceId,
    string SerialNumber,
    string Action,
    DateTime CreatedAt);

public record DeviceHistoryDto(
    int DeviceId,
    string SerialNumber,
    string? Model,
    string Status,
    string? FirmwareVersion,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IEnumerable<ChangeLogEntryDto> History);
