package com.venuevista.venuevista_backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@CrossOrigin
public class EventController {

    private final JdbcTemplate jdbcTemplate;

    public EventController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // 1. Get all events
    @GetMapping
    public List<Map<String, Object>> getEvents() {

        String sql = """
                SELECT
                    event_id,
                    name,
                    event_type,
                    description,
                    event_date,
                    start_time,
                    end_time,
                    venue_id,
                    status
                FROM events
                ORDER BY event_date
                """;

        return jdbcTemplate.queryForList(sql);
    }

    // 2. Get seats for a particular event
    @GetMapping("/{eventId}/seats")
    public List<Map<String, Object>> getSeats(@PathVariable int eventId) {

        String sql = """
                SELECT
                    es.event_seat_id,
                    s.seat_id,
                    s.row_name,
                    s.seat_number,
                    s.seat_type,
                    es.price,
                    es.status
                FROM event_seats es
                JOIN seats s ON es.seat_id = s.seat_id
                WHERE es.event_id = ?
                ORDER BY s.row_name, s.seat_number
                """;

        return jdbcTemplate.queryForList(sql, eventId);
    }
}