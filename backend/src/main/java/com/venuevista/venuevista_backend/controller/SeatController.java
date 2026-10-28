package com.venuevista.venuevista_backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seats")
@CrossOrigin
public class SeatController {

    private final JdbcTemplate jdbcTemplate;

    public SeatController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/event/{eventId}")
    public List<Map<String, Object>> getEventSeats(
            @PathVariable int eventId) {

        String sql = """
                SELECT
                    es.event_seat_id,
                    es.event_id,
                    es.price,
                    es.status,
                    s.row_name,
                    s.seat_number,
                    s.seat_type
                FROM event_seats es
                JOIN seats s
                    ON es.seat_id = s.seat_id
                WHERE es.event_id = ?
                ORDER BY s.row_name, s.seat_number
                """;

        return jdbcTemplate.queryForList(sql, eventId);
    }
}