# Booking Management System - API Documentation

## Overview

This is a comprehensive booking management system with role-based access control for **Customers**, **Business Owners**, and **Staff Members**.

---

## 📋 Table of Contents

1. [Booking Resource](#booking-resource)
2. [Staff Resource](#staff-resource)
3. [Authentication & Authorization](#authentication--authorization)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)

---

## 🎫 Booking Resource

### Customer Endpoints

#### `POST /booking`

**Create a new booking**

- **Role**: `CUSTOMER`
- **Body**:

```json
{
  "serviceId": "service-id",
  "staffId": "staff-id",
  "startTime": "2024-12-25T10:00:00Z",
  "customerNotes": "Optional notes"
}
```

- **Validations**:
  - Service must be active
  - Staff must be assigned to service
  - Time slot must be available
  - Booking time must be in the future
- **Response**: Created booking with service, staff, and business details

#### `GET /booking/my`

**Get my bookings**

- **Role**: `CUSTOMER`
- **Query Params**:
  - `status`: BookingStatus (optional)
  - `startDate`: ISO date (optional)
  - `endDate`: ISO date (optional)
- **Response**: Array of bookings

#### `GET /booking/my/:id`

**Get specific booking details**

- **Role**: `CUSTOMER`
- **Response**: Detailed booking with payment info

#### `PATCH /booking/my/:id`

**Update my booking**

- **Role**: `CUSTOMER`
- **Body**:

```json
{
  "startTime": "2024-12-26T11:00:00Z",
  "customerNotes": "Updated notes"
}
```

- **Restrictions**: Only PENDING bookings can be updated
- **Validations**: New time slot must be available

#### `DELETE /booking/my/:id`

**Cancel my booking**

- **Role**: `CUSTOMER`
- **Body**:

```json
{
  "cancellationReason": "Personal emergency"
}
```

- **Restrictions**: Cannot cancel COMPLETED bookings

---

### Business Owner Endpoints

#### `GET /booking/owner/all`

**Get all business bookings**

- **Role**: `BUSINESS_OWNER`
- **Query Params**: Same as customer endpoint
- **Response**: All bookings for the business with customer details

#### `GET /booking/owner/:id`

**Get booking details**

- **Role**: `BUSINESS_OWNER`
- **Response**: Full booking details including payment

#### `PATCH /booking/owner/:id/status`

**Update booking status**

- **Role**: `BUSINESS_OWNER`
- **Body**:

```json
{
  "status": "CONFIRMED",
  "staffNotes": "Confirmed with client"
}
```

- **Allowed Statuses**:
  - `CONFIRMED` - Sets confirmedAt timestamp
  - `COMPLETED` - Sets completedAt timestamp
  - `CANCELLED` - Sets cancelledAt timestamp
  - `NO_SHOW` - Customer didn't show up

---

### Staff Endpoints

#### `GET /booking/staff/my`

**Get my assigned bookings**

- **Role**: `STAFF`
- **Query Params**: Same as other endpoints
- **Response**: Bookings assigned to this staff member

#### `GET /booking/staff/my/:id`

**Get booking details**

- **Role**: `STAFF`
- **Response**: Booking details for assigned booking

#### `PATCH /booking/staff/my/:id/status`

**Update booking status**

- **Role**: `STAFF`
- **Body**: Same as owner status update
- **Allowed Statuses**: `CONFIRMED`, `COMPLETED`

---

## 👨‍💼 Staff Resource

### Profile Management

#### `GET /staff/profile`

**Get my staff profile**

- **Role**: `STAFF`
- **Response**:

```json
{
  "id": "staff-id",
  "userId": "user-id",
  "businessId": "business-id",
  "position": "Senior Hair Stylist",
  "bio": "10+ years experience...",
  "isActive": true,
  "customSchedule": {...},
  "user": {...},
  "business": {...},
  "_count": {
    "services": 5,
    "bookings": 120
  }
}
```

#### `PATCH /staff/profile`

**Update my profile**

- **Role**: `STAFF`
- **Body**:

```json
{
  "position": "Senior Hair Stylist",
  "bio": "Updated bio...",
  "customSchedule": {
    "monday": { "open": "10:00", "close": "18:00", "closed": false },
    "tuesday": { "open": "10:00", "close": "18:00", "closed": false }
  }
}
```

---

### Services

#### `GET /staff/services`

**Get my assigned services**

- **Role**: `STAFF`
- **Response**: Array of services assigned to staff member

---

### Schedule & Availability

#### `GET /staff/schedule`

**Get my schedule**

- **Role**: `STAFF`
- **Query Params**:
  - `startDate`: ISO date (optional, defaults to today)
  - `endDate`: ISO date (optional, defaults to +7 days)
- **Response**:

```json
{
  "customSchedule": {...},
  "bookings": [...],
  "dateRange": {
    "start": "2024-12-20T00:00:00Z",
    "end": "2024-12-27T00:00:00Z"
  }
}
```

#### `GET /staff/bookings/today`

**Get today's bookings**

- **Role**: `STAFF`
- **Response**: Array of today's bookings sorted by start time

#### `GET /staff/bookings/upcoming`

**Get upcoming bookings**

- **Role**: `STAFF`
- **Response**: Next 10 upcoming bookings

---

### Statistics & Analytics

#### `GET /staff/stats`

**Get my statistics**

- **Role**: `STAFF`
- **Query Params**:
  - `startDate`: ISO date (optional)
  - `endDate`: ISO date (optional)
- **Response**:

```json
{
  "totalBookings": 150,
  "completedBookings": 130,
  "cancelledBookings": 10,
  "pendingBookings": 5,
  "confirmedBookings": 5,
  "totalRevenue": 125000.0,
  "completionRate": "86.67"
}
```

---

### Business Information

#### `GET /staff/business`

**Get my business details**

- **Role**: `STAFF`
- **Response**: Business information including owner and stats

#### `GET /staff/business/staff`

**Get all business staff members**

- **Role**: `STAFF`
- **Response**: Array of all active staff in the same business

---

## 🔐 Authentication & Authorization

### Guards Used

1. **JwtAuthGuard**: Validates JWT token
2. **RolesGuard**: Validates user role

### Role Hierarchy

- `ADMIN` - System administrator
- `BUSINESS_OWNER` - Business owner
- `STAFF` - Staff member
- `CUSTOMER` - Regular customer

### Token Requirements

All protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource or conflicting state

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

---

## ✅ Best Practices

### 1. Booking Time Slot Validation

The system automatically:

- Validates time slots are in the future
- Checks for conflicting bookings
- Calculates end time based on service duration

### 2. Soft Deletion Pattern

Services and staff with active bookings are **deactivated** instead of deleted:

```json
{
  "message": "Service deactivated (has active bookings)!",
  "deactivated": true
}
```

### 3. Cascading Operations

- Deleting a business removes all related data
- Deleting a user removes their sessions and accounts
- Staff removal considers active bookings

### 4. Date/Time Handling

- All timestamps stored in UTC
- Use ISO 8601 format: `2024-12-25T10:00:00Z`
- Consider business timezone for display

### 5. Query Optimization

- All list endpoints use proper indexes
- Selective field loading with `select`
- Related data loaded with `include`

---

## 📊 Booking Status Flow

```
PENDING → CONFIRMED → COMPLETED
   ↓          ↓
CANCELLED  CANCELLED
   ↓
NO_SHOW (only from CONFIRMED)
```

### Status Transitions

- **Customer**: Can create (PENDING) and cancel
- **Staff**: Can confirm and complete
- **Owner**: Can manage all statuses including NO_SHOW

---

## 🔄 Payment Integration Ready

The schema includes a Payment model linked to bookings:

- Payment status tracked separately
- Provider reference for external payment gateways
- Webhook payload storage for reconciliation

---

## 📝 Notes

1. **Staff Assignment**: Staff must be assigned to a service before customers can book
2. **Business Hours**: Validated against `businessHours` and staff `customSchedule`
3. **Multi-tenancy**: Each business is isolated via `businessId`
4. **Audit Trail**: Timestamps tracked for key actions (confirmed, completed, cancelled)

---

## 🚀 Getting Started

1. Import modules in `app.module.ts`
2. Run Prisma migrations
3. Seed initial data (admin user, test business)
4. Test endpoints with Swagger UI at `/api`

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
