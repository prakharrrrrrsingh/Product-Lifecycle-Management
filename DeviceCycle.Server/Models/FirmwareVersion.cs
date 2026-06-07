using System;
using System.Collections.Generic;

namespace DeviceCycle.Server.Models;

public partial class FirmwareVersion
{
    public int Id { get; set; }

    public string Version { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime ReleasedAt { get; set; }

}
