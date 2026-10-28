package com.venuevista.venuevista_backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin
public class BookingController {

    private final JdbcTemplate jdbcTemplate;

    public BookingController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping
    @Transactional
    public Map<String, Object> createBooking(
            @RequestBody Map<String, Object> request) {

        Integer userId = (Integer) request.get("userId");
        Integer eventId = (Integer) request.get("eventId");

        @SuppressWarnings("unchecked")
        List<Integer> eventSeatIds =
                (List<Integer>) request.get("eventSeatIds");

        String paymentMethod =
                request.getOrDefault("paymentMethod", "UPI").toString();

        if (userId == null ||
                eventId == null ||
                eventSeatIds == null ||
                eventSeatIds.isEmpty()) {

            throw new RuntimeException(
                    "userId, eventId and eventSeatIds are required"
            );
        }

        double totalAmount = 0;

        for (Integer eventSeatId : eventSeatIds) {

            List<Map<String, Object>> seats =
                    jdbcTemplate.queryForList(
                            """
                            SELECT price, status
                            FROM event_seats
                            WHERE event_seat_id = ?
                            AND event_id = ?
                            """,
                            eventSeatId,
                            eventId
                    );

            if (seats.isEmpty()) {
                throw new RuntimeException(
                        "Seat not found: " + eventSeatId
                );
            }

            String status =
                    seats.get(0).get("status").toString();

            if (!status.equals("AVAILABLE")) {
                throw new RuntimeException(
                        "Seat " + eventSeatId + " is already booked"
                );
            }

            totalAmount +=
                    ((Number) seats.get(0).get("price"))
                            .doubleValue();
        }

        final double finalTotalAmount = totalAmount;

        KeyHolder bookingKeyHolder =
                new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps =
                    connection.prepareStatement(
                            """
                            INSERT INTO bookings
                            (user_id, event_id, total_amount, status)
                            VALUES (?, ?, ?, 'CONFIRMED')
                            """,
                            Statement.RETURN_GENERATED_KEYS
                    );

            ps.setInt(1, userId);
            ps.setInt(2, eventId);
            ps.setDouble(3, finalTotalAmount);

            return ps;

        }, bookingKeyHolder);

        int bookingId =
                bookingKeyHolder.getKey().intValue();

        List<Integer> bookingSeatIds =
                new ArrayList<>();

        for (Integer eventSeatId : eventSeatIds) {

            KeyHolder bookingSeatKeyHolder =
                    new GeneratedKeyHolder();

            jdbcTemplate.update(connection -> {

                PreparedStatement ps =
                        connection.prepareStatement(
                                """
                                INSERT INTO booking_seats
                                (booking_id, event_seat_id, price)
                                SELECT ?, event_seat_id, price
                                FROM event_seats
                                WHERE event_seat_id = ?
                                """,
                                Statement.RETURN_GENERATED_KEYS
                        );

                ps.setInt(1, bookingId);
                ps.setInt(2, eventSeatId);

                return ps;

            }, bookingSeatKeyHolder);

            int bookingSeatId =
                    bookingSeatKeyHolder.getKey().intValue();

            bookingSeatIds.add(bookingSeatId);

            int updated = jdbcTemplate.update(
                    """
                    UPDATE event_seats
                    SET status = 'BOOKED'
                    WHERE event_seat_id = ?
                    AND status = 'AVAILABLE'
                    """,
                    eventSeatId
            );

            if (updated != 1) {
                throw new RuntimeException(
                        "Could not book seat: " + eventSeatId
                );
            }
        }

        String transactionId =
                "TXN-" +
                        UUID.randomUUID()
                                .toString()
                                .substring(0, 8)
                                .toUpperCase();

        jdbcTemplate.update(
                """
                INSERT INTO payments
                (booking_id, amount, payment_method,
                 payment_status, transaction_id)
                VALUES (?, ?, ?, 'SUCCESS', ?)
                """,
                bookingId,
                totalAmount,
                paymentMethod,
                transactionId
        );

        List<String> ticketNumbers =
                new ArrayList<>();

        for (Integer bookingSeatId : bookingSeatIds) {

            String ticketNumber =
                    "VV-TKT-" +
                            UUID.randomUUID()
                                    .toString()
                                    .substring(0, 8)
                                    .toUpperCase();

            jdbcTemplate.update(
                    """
                    INSERT INTO tickets
                    (booking_id, booking_seat_id,
                     ticket_number, ticket_status)
                    VALUES (?, ?, ?, 'ACTIVE')
                    """,
                    bookingId,
                    bookingSeatId,
                    ticketNumber
            );

            ticketNumbers.add(ticketNumber);
        }

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("message", "Booking successful");
        response.put("bookingId", bookingId);
        response.put("eventId", eventId);
        response.put("userId", userId);
        response.put("seatsBooked", eventSeatIds);
        response.put("totalAmount", totalAmount);
        response.put("paymentStatus", "SUCCESS");
        response.put("transactionId", transactionId);
        response.put("tickets", ticketNumbers);

        return response;
    }

    @GetMapping("/{bookingId}")
    public Map<String, Object> getBooking(
            @PathVariable int bookingId) {

        String bookingSql = """
                SELECT
                    b.booking_id,
                    b.user_id,
                    b.event_id,
                    e.name AS event_name,
                    e.event_date,
                    e.start_time,
                    b.booking_date,
                    b.total_amount,
                    b.status
                FROM bookings b
                JOIN events e
                    ON b.event_id = e.event_id
                WHERE b.booking_id = ?
                """;

        List<Map<String, Object>> booking =
                jdbcTemplate.queryForList(
                        bookingSql,
                        bookingId
                );

        if (booking.isEmpty()) {
            throw new RuntimeException(
                    "Booking not found"
            );
        }

        String ticketSql = """
                SELECT
                    t.ticket_id,
                    t.ticket_number,
                    t.ticket_status,
                    bs.event_seat_id,
                    s.row_name,
                    s.seat_number,
                    s.seat_type,
                    bs.price
                FROM tickets t
                JOIN booking_seats bs
                    ON t.booking_seat_id = bs.booking_seat_id
                JOIN event_seats es
                    ON bs.event_seat_id = es.event_seat_id
                JOIN seats s
                    ON es.seat_id = s.seat_id
                WHERE t.booking_id = ?
                """;

        List<Map<String, Object>> tickets =
                jdbcTemplate.queryForList(
                        ticketSql,
                        bookingId
                );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("booking", booking.get(0));
        response.put("tickets", tickets);

        return response;
    }
}