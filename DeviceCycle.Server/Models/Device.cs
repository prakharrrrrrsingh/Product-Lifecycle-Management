using System;
using System.Collections.Generic;

namespace DeviceCycle.Server.Models;

public partial class Device
{
    public int Id { get; set; }

    public string SerialNumber { get; set; } = null!;

    public string? Model { get; set; }

    public string Status { get; set; } = null!;

    public string? FirmwareVersion { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<ChangeLog> ChangeLogs { get; set; } = new List<ChangeLog>();
}
