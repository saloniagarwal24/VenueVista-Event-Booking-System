import { useEffect, useMemo, useState } from "react";
import "./App.css";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=2000&q=85",
    small: "LIVE EXPERIENCES",
    title: "Experience the Moment",
    text: "Create memories that stay with you."
  },
  {
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=85",
    small: "CONNECT • INSPIRE • DISCOVER",
    title: "Ideas Bring Us Together",
    text: "Discover events that inspire and connect."
  },
  {
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=85",
    small: "CELEBRATE TOGETHER",
    title: "Make Every Event Count",
    text: "Your next unforgettable experience starts here."
  }
];

const eventTypeImages = {
  FESTIVAL:
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=85",

  CONFERENCE:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=85",

  CONCERT:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85",

  EXHIBITION:
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1400&q=85",

  COMEDY:
    "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1400&q=85",

  SPORTS:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1400&q=85",

  FASHION:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85",

  TECHNOLOGY:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85"
};

const defaultEventImage =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85";

const EVENTS_PER_PAGE = 6;

function App() {
  const [events, setEvents] = useState([]);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);

  useEffect(() => {
    fetch("http://localhost:8080/api/events")
      .then(response => response.json())
      .then(data => setEvents(data))
      .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    return [
      "ALL",
      ...new Set(events.map(event => event.event_type))
    ];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" ||
        event.event_type === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [events, searchTerm, selectedCategory]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);

  const loadSeats = eventId => {
    setSelectedEventId(eventId);
    setSelectedSeats([]);
    setBookingDetails(null);

    fetch(`http://localhost:8080/api/seats/event/${eventId}`)
      .then(response => response.json())
      .then(data => {
        setSeats(data);

        setTimeout(() => {
          document
            .getElementById("booking")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }, 100);
      })
      .catch(error => console.error(error));
  };

  const selectSeat = seat => {
    if (seat.status !== "AVAILABLE") {
      return;
    }

    if (selectedSeats.includes(seat.event_seat_id)) {
      setSelectedSeats(
        selectedSeats.filter(
          id => id !== seat.event_seat_id
        )
      );
    } else {
      setSelectedSeats([
        ...selectedSeats,
        seat.event_seat_id
      ]);
    }
  };

  const selectedSeatObjects = seats.filter(seat =>
    selectedSeats.includes(seat.event_seat_id)
  );

  const calculateTotal = () => {
    return selectedSeatObjects.reduce(
      (total, seat) => total + Number(seat.price),
      0
    );
  };

  const bookSeats = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat.");
      return;
    }

    fetch("http://localhost:8080/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: 3,
        eventId: selectedEventId,
        eventSeatIds: selectedSeats,
        paymentMethod: "UPI"
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Booking failed");
        }

        return response.json();
      })
      .then(data => {
        setBookingDetails(data);
        setSelectedSeats([]);

        fetch(
          `http://localhost:8080/api/seats/event/${selectedEventId}`
        )
          .then(response => response.json())
          .then(data => setSeats(data));

        setTimeout(() => {
          document
            .getElementById("confirmation")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }, 200);
      })
      .catch(error => {
        console.error(error);
        alert("Booking failed. Please try again.");
      });
  };

  const handleSearch = value => {
    setSearchTerm(value);
    setVisibleCount(EVENTS_PER_PAGE);
  };

  const handleCategory = category => {
    setSelectedCategory(category);
    setVisibleCount(EVENTS_PER_PAGE);
  };

  const showMore = () => {
    setVisibleCount(prev => prev + EVENTS_PER_PAGE);
  };

  const showLess = () => {
    setVisibleCount(EVENTS_PER_PAGE);

    document
      .getElementById("events")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  };

  const slide = slides[currentSlide];

  return (
    <div className="app">

      <section
        className="hero-slideshow"
        style={{
          backgroundImage: `url("${slide.image}")`
        }}
        id="home"
      >
        <div className="hero-overlay"></div>

        <nav className="navbar">
          <div className="logo">
            VENUE<span>VISTA</span>
          </div>

          <div className="nav-links">
            <a href="#home">HOME</a>
            <a href="#events">EVENTS</a>
            <a href="#booking">BOOK TICKETS</a>
          </div>

          <div className="nav-action">
            <a href="#events">EXPLORE</a>
          </div>
        </nav>

        <div className="hero-content">
          <p className="hero-small">
            {slide.small}
          </p>

          <h1>{slide.title}</h1>

          <p className="hero-text">
            {slide.text}
          </p>

          <a
            href="#events"
            className="hero-button"
          >
            EXPLORE EVENTS
          </a>
        </div>

        <div className="slide-controls">
          <div className="slide-count">
            0{currentSlide + 1} / 0{slides.length}
          </div>

          <div className="slide-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={
                  currentSlide === index
                    ? "dot active"
                    : "dot"
                }
                onClick={() =>
                  setCurrentSlide(index)
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="intro-section">
        <p className="section-label">
          WELCOME TO VENUEVISTA
        </p>

        <h2>
          Where unforgettable
          <br />
          <span>experiences begin.</span>
        </h2>

        <p className="intro-text">
          Discover concerts, festivals, conferences
          and experiences around you. Choose your
          event, find your perfect seat and book your
          tickets in just a few clicks.
        </p>
      </section>

      <section
        className="events-section"
        id="events"
      >

        <div className="section-heading">
          <div>
            <p className="section-label">
              DISCOVER
            </p>

            <h2>Upcoming Events</h2>
          </div>

          <p>
            {filteredEvents.length} experiences
            available.
          </p>
        </div>

        <div className="event-tools">

          <div className="search-box">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={e =>
                handleSearch(e.target.value)
              }
            />

            {searchTerm && (
              <button
                className="clear-search"
                onClick={() =>
                  handleSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category}
                className={
                  selectedCategory === category
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() =>
                  handleCategory(category)
                }
              >
                {category}
              </button>
            ))}
          </div>

        </div>

        {filteredEvents.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">
              ◌
            </div>

            <h3>No events found</h3>

            <p>
              Try searching for another event or
              selecting a different category.
            </p>

            <button
              onClick={() => {
                handleSearch("");
                handleCategory("ALL");
              }}
            >
              SHOW ALL EVENTS
            </button>
          </div>
        ) : (
          <>
            <div className="events-grid">

              {visibleEvents.map(event => (

                <div
                  className="event-card"
                  key={event.event_id}
                >

                  <div
                    className="event-image"
                    style={{
                      backgroundImage: `url("${
                        eventTypeImages[
                          event.event_type
                        ] || defaultEventImage
                      }")`
                    }}
                  >

                    <div className="event-image-overlay"></div>

                    <span className="event-category">
                      {event.event_type}
                    </span>

                    <span className="event-status">
                      {event.status}
                    </span>

                  </div>

                  <div className="event-content">

                    <h3>{event.name}</h3>

                    <p className="event-description">
                      {event.description ||
                        "An unforgettable event experience awaits you."}
                    </p>

                    <div className="event-meta">

                      <div>
                        <small>DATE</small>

                        <strong>
                          {event.event_date}
                        </strong>
                      </div>

                      <div>
                        <small>TIME</small>

                        <strong>
                          {event.start_time}
                          {" - "}
                          {event.end_time}
                        </strong>
                      </div>

                    </div>

                    <button
                      className="select-button"
                      onClick={() =>
                        loadSeats(
                          event.event_id
                        )
                      }
                    >
                      SELECT YOUR SEAT

                      <span>→</span>
                    </button>

                  </div>

                  {selectedEventId ===
                    event.event_id &&
                    seats.length > 0 && (

                      <div
                        className="seat-section"
                        id="booking"
                      >

                        <div className="seat-heading">

                          <div>
                            <p className="section-label">
                              RESERVE
                            </p>

                            <h3>
                              Choose Your Seat
                            </h3>
                          </div>

                          <div className="seat-legend">

                            <span>
                              <i className="available-dot"></i>
                              Available
                            </span>

                            <span>
                              <i className="selected-dot"></i>
                              Selected
                            </span>

                            <span>
                              <i className="booked-dot"></i>
                              Booked
                            </span>

                          </div>

                        </div>

                        <div className="screen">
                          SCREEN
                        </div>

                        <div className="seat-container">

                          {seats.map(seat => (

                            <button
                              key={
                                seat.event_seat_id
                              }
                              className={
                                selectedSeats.includes(
                                  seat.event_seat_id
                                )
                                  ? "seat selected-seat"
                                  : seat.status !==
                                    "AVAILABLE"
                                  ? "seat booked-seat"
                                  : "seat"
                              }
                              onClick={() =>
                                selectSeat(seat)
                              }
                              disabled={
                                seat.status !==
                                "AVAILABLE"
                              }
                            >

                              <strong>
                                {seat.row_name}
                                {seat.seat_number}
                              </strong>

                              <small>
                                ₹{seat.price}
                              </small>

                            </button>

                          ))}

                        </div>

                        <div className="booking-panel">

                          <div>
                            <small>
                              SELECTED SEATS
                            </small>

                            <strong>
                              {selectedSeatObjects.length
                                ? selectedSeatObjects
                                    .map(
                                      seat =>
                                        `${seat.row_name}${seat.seat_number}`
                                    )
                                    .join(", ")
                                : "None"}
                            </strong>
                          </div>

                          <div>
                            <small>TOTAL</small>

                            <strong className="total">
                              ₹{calculateTotal()}
                            </strong>
                          </div>

                          <button
                            className="confirm-button"
                            onClick={bookSeats}
                            disabled={
                              selectedSeats.length ===
                              0
                            }
                          >
                            CONFIRM BOOKING →
                          </button>

                        </div>

                      </div>
                    )}

                  {selectedEventId ===
                    event.event_id &&
                    bookingDetails && (

                      <div
                        className="confirmation"
                        id="confirmation"
                      >

                        <div className="success-circle">
                          ✓
                        </div>

                        <div>

                          <p className="section-label">
                            BOOKING CONFIRMED
                          </p>

                          <h3>
                            Your experience is booked.
                          </h3>

                          <div className="confirmation-details">

                            <span>
                              Booking #
                              {
                                bookingDetails.bookingId
                              }
                            </span>

                            <span>
                              ₹
                              {
                                bookingDetails.totalAmount
                              }
                            </span>

                            <span>
                              PAYMENT SUCCESS
                            </span>

                          </div>

                          <p>
                            Transaction ID:{" "}
                            {
                              bookingDetails.transactionId
                            }
                          </p>

                          <div className="ticket-list">

                            <small>
                              TICKETS
                            </small>

                            {bookingDetails.tickets?.map(
                              ticket => (
                                <span key={ticket}>
                                  {ticket}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                      </div>
                    )}

                </div>

              ))}

            </div>

            <div className="load-more-area">

              {visibleCount <
                filteredEvents.length && (

                <button
                  className="load-more-button"
                  onClick={showMore}
                >
                  LOAD MORE EVENTS

                  <span>↓</span>
                </button>
              )}

              {visibleCount >=
                filteredEvents.length &&
                filteredEvents.length >
                  EVENTS_PER_PAGE && (

                  <button
                    className="load-more-button"
                    onClick={showLess}
                  >
                    SHOW LESS

                    <span>↑</span>
                  </button>
                )}

              <p className="event-count">
                Showing{" "}
                {Math.min(
                  visibleCount,
                  filteredEvents.length
                )}{" "}
                of {filteredEvents.length} events
              </p>

            </div>
          </>
        )}

      </section>

      <footer className="footer">

        <div className="footer-logo">
          VENUE<span>VISTA</span>
        </div>

        <p>
          Where experiences begin.
        </p>

        <div className="footer-line"></div>

        <small>
          © 2026 VenueVista. All rights reserved.
        </small>

      </footer>

    </div>
  );
}

export default App;