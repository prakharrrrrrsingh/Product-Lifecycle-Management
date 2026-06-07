using System;
using System.Collections.Generic;

namespace DeviceCycle.Server.Models;

public partial class ChangeLog
{
    public int Id { get; set; }

    public int? DeviceId { get; set; }

    public string? SerialNumber { get; set; }

    public string Action { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Device? Device { get; set; }
}
