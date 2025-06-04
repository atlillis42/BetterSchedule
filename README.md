# BetterSchedule

Scheduling Application built in React/ASP.Net Core 8 

Overall Goal:

Create a full featured scheduling app (Web page and mobile) that allows for decrementing service packages, multiple location options for services (with corresponding calendar blocking), login, calendar, calendar integration, payment links, notifications, and waiver attachments.

MVP Goal:

    Users can login, have user roles, and access their own calendar and reservations list (Cookie based Authentication and Authorization                           
    Manager/Owner can change user roles
    Basic Calendar functionality on a React SPA (Daypilot open source components)
    Ability to attach reservation info to calendar
    Users can view, book, and cancel reservations
        Booking- (GuestName, Date/Time, ReservationType, **Maybe ReservationLength, **?MVP Location)
    Users can define when their calendar availability for reservations
        Future - availability can be changed for specific reservation types
    Users can create unique reservation types
    User can view reservation history (All history of User)
        Future - Adjustable display criteria- view by Guest, Date-Range, reservation type, etc.
Task List:

        Basic ASP.NET Core Identity Back-End Auth setup/dev Db initial/continuous Migration - DONE
        Front-End Auth wire-up (ASP.NET -> React client)
        Login Page
        DayPilot Schedule Integration
        Models (in progress Todo list)
            ApplicationUser (separate from Auth?)
            Reservation
            AppointmentType
            Packages (Auto-Decrementing, assigned to clients)
            Calendar Related
            Location (Model or property within Appointment Type)
        Calendar Component
            Front-End
            Back-End
        Booking Component
            Front-End
            Back-End
        Client View Component
            Front-End
            Back-End
        Appointments View/Setup Component
            Front-End
            Back-End
        Availability View/Setup Component
            Front-End
            Back-End
        Roles Admin Component
            Front-End
            Back-End
        Documents Component (Required Y/N, fillable form that saves to db)
            Front-End
            Back-End
        Roles/Claims setup 
        Role based Auth added to all endpoints
        UI and UX cleanup
        Unit Tests
        BugFixes/Refactor


        After MVP complete:
        External Auth Provider
        External Payment Provider
        Notifications
        Default No-Show/Can change
        


        
Full Feature Goal:

Manager can own a calendar node? (name tbd). They have general high level control of application, and unique permissions to create users within their space etc

    Can create and assign service provider users
    Access to all records (possibly allow more customization on a node-by-node basis
    Can link up online payment portal
    can create locations/seats/spaces/ etc. that can be rented
    Can determine default no-show penalty and notification types (allow for them to open that to service providers?)
    Can view service provider schedules and edit those schedules
    Login through same portal, has unique page they can access OR auto routed to first
    Waiver digital storage option?
    Can set specific hours for different locations (assumed ownership of locations)

Allow multiple "service providers" within organization.

    One user would own the application. "Manager" role?
    User could designate other users to "service provider roles". Those roles could be defined
    Service providers can list their services, manage their schedule, etc. Ideally payment agreements between service providers and "Manager" can be automatically enacted
    Service providers can see schedule of their upcoming clients/services/location for it
    Service providers can View several different "views" of schedule (daily, monthly, yearly)
    Service Providers can view reports of their activity/sales/linked clients
    Service Providers can create clients in the application

Calendar

    Needs to digitally link to DateTime
    Output to calendar view
    Dates are clickable/interactable buttons
    Needs to link up to all schedule actions *Book a time *Cancel a booking *Block off service availability *Add service availability *Recurring schedules *Pull data from server if allow guests to book own appt.
        View by service provider (default view of self for service provider)
        View by location/overall bookings(default view for manager?)
    Maybe lock by timeslots? Optional, or default 30/60 minute increments?

Users

    Authentication and Authorization scaffolded with google initially maybe?
    I don't want to figure out security stuff on my own.
    Normal user information (Id, name, email, phone, b-day,)
    PackageId (links to package information)
    PaymentsId (links to payments information)
    ReservationsId (links to actual scheduled stuff)
    User Roles (Manager, Service Provider, potentially allow for mixed role permissions (so several tiers of service providers)

Appointments (Actually half of this should be "AppointmentTypes" and half should be Reservations)****

    Need to show up in Calendar
    Link to service provider
    Link to created "client"
    Link to DateTime
    Link to Location
    Modifiable "length"
    "TypeOf" appointment probably can be created and filled in by service provider and/or manager
    Connect to Reservations

Reservations

    List of Appointments, basically. SQL statement to define them based on datetime, user, view etc.

Payment Stuff

    Research what prebuilt options for this are. Likely something google or venmo/stripe or something have already built out will do the trick
    Will need to link somehow to a transaction id

Transactions

    Will need a list of transactional stuff. Handled by API and SQL
    Probably use some basic sales style stuff for MVP before upgrading for better reporting and movement
