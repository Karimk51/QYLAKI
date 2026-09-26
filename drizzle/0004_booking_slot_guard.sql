-- Concurrency-safe protection for active booking slots.
-- A generated NULL value for cancelled/completed rows allows those slots to be requested again.
ALTER TABLE `bookings`
  ADD COLUMN `activeSlotKey` varchar(48)
    GENERATED ALWAYS AS (CASE WHEN `status` IN ('requested', 'confirmed') THEN CONCAT(`bookingDate`, 'T', `bookingTime`) ELSE NULL END) STORED;

CREATE UNIQUE INDEX `bookings_active_slot_unique` ON `bookings` (`activeSlotKey`);
CREATE INDEX `bookings_user_id_idx` ON `bookings` (`userId`);
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);
CREATE INDEX `bookings_date_time_idx` ON `bookings` (`bookingDate`, `bookingTime`);
