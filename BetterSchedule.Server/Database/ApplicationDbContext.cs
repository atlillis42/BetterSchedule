using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace BetterSchedule.Server.Database
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<CalendarResource> CalendarResources { get; set; }
        public DbSet<BlockedTime> BlockedTimes { get; set; }
        public DbSet<Reservation> Reservations { get; set; }
        public DbSet<AppointmentType> AppointmentTypes { get; set; }
        public DbSet<ReservationParticipant> ReservationParticipants { get; set; }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            //builder.Entity<User>().Property(u => u.UserName)
            //    .HasMaxLength(256)
            //    .IsRequired();

            builder.Entity<AppointmentType>()
                .Property(a => a.Price)
                .HasColumnType("decimal(18,2)");

            builder.HasDefaultSchema("identity");
        }
    }
}
