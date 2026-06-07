using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DeviceCycle.Server.Models;

public partial class DeviceRegistrationLifecycleContext : IdentityDbContext<ApplicationUser>
{
    public DeviceRegistrationLifecycleContext()
    {
    }

    public DeviceRegistrationLifecycleContext(DbContextOptions<DeviceRegistrationLifecycleContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ChangeLog> ChangeLogs { get; set; }

    public virtual DbSet<Device> Devices { get; set; }

    public virtual DbSet<FirmwareVersion> FirmwareVersions { get; set; }



    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ChangeLog>(entity =>
        {
            entity.Property(e => e.Action).HasMaxLength(255);
            entity.Property(e => e.SerialNumber).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Device).WithMany(p => p.ChangeLogs)
                .HasForeignKey(d => d.DeviceId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Device>(entity =>
        {
            entity.HasIndex(e => e.SerialNumber).IsUnique();
            entity.Property(e => e.FirmwareVersion).HasMaxLength(50);
            entity.Property(e => e.Model).HasMaxLength(100);
            entity.Property(e => e.SerialNumber).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<FirmwareVersion>(entity =>
        {
            entity.HasIndex(e => e.Version).IsUnique();
            entity.Property(e => e.ReleasedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Version).HasMaxLength(50);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
