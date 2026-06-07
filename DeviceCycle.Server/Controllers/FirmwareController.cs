using DeviceCycle.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;


namespace DeviceCycle.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class FirmwareController : ControllerBase
{
    private readonly DeviceRegistrationLifecycleContext _context;

    public FirmwareController(DeviceRegistrationLifecycleContext context)
    {
        _context = context;
    }

    // GET /api/firmware
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<FirmwareVersionsDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<FirmwareVersionsDto>>> GetFirmwareVersionss()
    {
        var versions = await _context.FirmwareVersions
            .OrderByDescending(f => f.Id) // newest first
            .Select(f => new FirmwareVersionsDto(f.Id, f.Version, f.Notes))
            .ToListAsync();

        return Ok(versions);
    }

    // GET /api/firmware/{id}
    [HttpGet("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(FirmwareVersionsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FirmwareVersionsDto>> GetFirmwareVersions(int id)
    {
        var firmware = await _context.FirmwareVersions.FindAsync(id);
        if (firmware is null)
            return NotFound(new { message = $"Firmware version with id {id} not found." });

        return Ok(new FirmwareVersionsDto(firmware.Id, firmware.Version, firmware.Notes));
    }

    // POST /api/firmware — Admin only
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(FirmwareVersionsDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FirmwareVersionsDto>> AddFirmwareVersions(
        [FromBody] AddFirmwareVersionsRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool versionExists = await _context.FirmwareVersions
            .AnyAsync(f => f.Version == request.Version);

        if (versionExists)
            return Conflict(new { message = $"Firmware version '{request.Version}' already exists." });

        var firmware = new FirmwareVersion
        {
            Version = request.Version,
            Notes = request.Notes,
            ReleasedAt = DateTime.UtcNow
        };

        _context.FirmwareVersions.Add(firmware);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetFirmwareVersions),
            new { id = firmware.Id },
            new FirmwareVersionsDto(firmware.Id, firmware.Version, firmware.Notes)
        );
    }

    // DTOs
    public record FirmwareVersionsDto(int Id, string Version, string? Notes);

    public class AddFirmwareVersionsRequest
    {
        [Required]
        [StringLength(50)]
        public string Version { get; set; } = null!;

        public string? Notes { get; set; }
    }
}
