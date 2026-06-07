using Microsoft.AspNetCore.Identity;

namespace DeviceCycle.Server.Models;

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
}
