using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DeviceCycle.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace DeviceCycle.Server.Controllers;

// ──────────────────────────────────────────────────────────────
// AuthController — handles user registration and JWT login.
// Routes are prefixed with /api/auth (via [Route("api/[controller]")]).
// ──────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    /// <summary>
    /// Injects ASP.NET Identity's UserManager and the app configuration
    /// (used to read JWT settings and the admin registration code).
    /// </summary>
    public AuthController(UserManager<ApplicationUser> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/auth/register
    // ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Registers a new standard (read-only) user account.
    /// The new account is assigned the "User" role, which grants
    /// read-only access to all API endpoints.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Map the incoming request to an ApplicationUser identity entity
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        // Let Identity handle password hashing and uniqueness validation
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        // Assign read-only "User" role after successful account creation
        await _userManager.AddToRoleAsync(user, "User");

        return Ok(new { message = "Registration successful. You have read-only access." });
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/auth/register-admin
    // ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Registers a new administrator account.
    /// Requires a secret admin registration code (stored in configuration)
    /// to prevent unauthorised admin account creation.
    /// Admins receive full CRUD access to the API.
    /// </summary>
    [HttpPost("register-admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RegisterAdmin([FromBody] RegisterAdminRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Validate the shared secret admin code before creating the account
        var expectedCode = _config["AdminRegistrationCode"];
        if (request.AdminCode != expectedCode)
            return StatusCode(403, new { message = "Invalid admin registration code." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        // Assign the "Admin" role, which unlocks all write endpoints
        await _userManager.AddToRoleAsync(user, "Admin");

        return Ok(new { message = "Admin registration successful. You have full CRUD access." });
    }

    // ──────────────────────────────────────────────────────────────
    // POST /api/auth/login
    // ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Authenticates a user with email and password.
    /// On success, returns a signed JWT containing the user's role,
    /// display name, and expiry time.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Look up the user by email address
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return Unauthorized(new { message = "This email is not registered. Please register first." });

        // Verify the provided password against the stored hash
        if (!await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { message = "Incorrect password. Please try again." });

        // Retrieve the user's roles; fall back to "User" if none are assigned
        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";

        var token = GenerateJwtToken(user, role);
        var expiry = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "120");

        return Ok(new LoginResponse(
            token,
            user.Email!,
            user.FullName,
            role,
            DateTime.UtcNow.AddMinutes(expiry)
        ));
    }

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds and signs a JWT token for the given user.
    /// The token includes the user's ID, email, role, full name, and a
    /// unique token ID (Jti) to support future revocation scenarios.
    /// </summary>
    private string GenerateJwtToken(ApplicationUser user, string role)
    {
        // Create the signing key from the configured secret
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "120");

        // Build the claims payload embedded inside the token
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Role, role),
            new Claim("fullName", user.FullName ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // unique token ID
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: creds
        );

        // Serialize the token to a compact Base64Url string
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// ──────────────────────────────────────────────────────────────
// Request / Response DTOs
// ──────────────────────────────────────────────────────────────

/// <summary>Payload for the standard (read-only) user registration endpoint.</summary>
public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = null!;

    public string? FullName { get; set; }
}

/// <summary>
/// Payload for the admin registration endpoint.
/// Includes an AdminCode that must match the server-side secret.
/// </summary>
public class RegisterAdminRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = null!;

    public string? FullName { get; set; }

    [Required]
    public string AdminCode { get; set; } = null!;
}

/// <summary>Payload for the login endpoint.</summary>
public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}

/// <summary>
/// Response returned after a successful login.
/// The Token is a signed JWT that the client must include in the
/// Authorization: Bearer header for all subsequent API calls.
/// </summary>
public record LoginResponse(
    string Token,
    string Email,
    string? FullName,
    string Role,
    DateTime ExpiresAt
);
