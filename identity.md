# ASP.NET Core Identity

## Identity schema configuration
The `ApplicationDbContext` maps every ASP.NET Core Identity table to the `identity` schema. Each entity explicitly sets its table name so that the default `AspNet*` tables live in a dedicated schema rather than the default `dbo` schema.

## ApplicationUser extensions
`ApplicationUser` extends `IdentityUser` with:

- `FullName`
- `IsDeleted`
- `OrganizationId` and `Organization`

These properties allow linking users to an `Organization`. The context configures a foreign key from `ApplicationUser.OrganizationId` to `Organization` with delete behavior restricted so that removing an organization will not cascade into user rows.

## Customizing roles and adding identity entities
The application registers identity services with support for roles and Entity Framework stores. Default roles (`Manager`, `ServiceProvider`, and `Client`) are seeded during development.

When adding new identity-related entities (e.g., a custom role type or profile table):

1. Define the class deriving from the appropriate Identity type.
2. Map it to the `identity` schema with `.ToTable("YourTable", "identity")` in `OnModelCreating` and add any required relationships.
3. Add a `DbSet` if the entity needs direct access.
4. Update seeding or initialization code (such as roles in `DbInitializer`) as needed.
5. Create and apply a new EF Core migration so the new tables are created.

To customize roles with extra fields, create an `ApplicationRole : IdentityRole`, update the identity registration (`.AddRoles<ApplicationRole>()`), and seed the new roles. Ensure any additional tables continue to use the `identity` schema for consistency.