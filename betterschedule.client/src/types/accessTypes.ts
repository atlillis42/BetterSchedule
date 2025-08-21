export type ResourceId = number;
export type AppointmentTypeId = number;
export type UserId = string;

// Provider ↔ Resource
export interface AssignProviderResourceRequest { userId: UserId; resourceId: ResourceId; }

// Provider ↔ AppointmentType
export interface AssignProviderAppointmentTypeRequest { userId: UserId; appointmentTypeId: AppointmentTypeId; }

// AppointmentType ↔ Resource
export interface AssignAppointmentTypeResourceRequest { appointmentTypeId: AppointmentTypeId; resourceId: ResourceId; }
