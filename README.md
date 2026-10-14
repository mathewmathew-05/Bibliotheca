# Book Tracker

A small, responsive web app for tracking books you want to read, are reading, and have finished. It is plain HTML, CSS and JavaScript. There is no backend, no build step and no dependencies.

## Features

- Add books with a title, author and status (To read, Reading, Finished)
- Newest books appear first
- Live search by title or author, ignoring capitalization and extra spaces
- Status count tiles that also work as filters
- Change a book's status from its card, or delete it (with a confirmation)
- Duplicate protection: the same title and author (ignoring case and extra spaces) cannot be added twice. The same title by a different author is allowed.
- Helpful empty states for an empty shelf, no search matches, and empty filters
- Accessible: skip link, labelled fields, screen reader announcements, keyboard focus handling, visible focus rings
- Responsive layout with automatic light and dark themes

## Setup

No installation is needed.

1. Download or clone this folder.
2. Open `index.html` in a modern browser.

If you prefer to serve it locally, run `python3 -m http.server 8000` in this folder and visit http://localhost:8000.

## Files

- `index.html`: markup, form, filters, list and the book card template
- `styles.css`: design tokens, layout, themes and responsive rules
- `app.js`: state, storage, rendering and event handling
- `PROMPTS.md`: the prompts used to build the project

## Technology choices

- Vanilla JavaScript in one self-contained script, so there is nothing to install or bundle
- `localStorage` instead of a server, so the app works offline and can be hosted as static files
- Book text is written with `textContent`, never `innerHTML`, so titles cannot inject markup
- CSS custom properties for colours, spacing and type, with `prefers-color-scheme` for dark mode
- System fonts and Georgia for titles, so no font files or external requests are needed

## localStorage behavior

- All books are stored in one JSON array under the key `bookTracker.books.v1`.
- Each book has `id`, `title`, `author`, `status` and `createdAt` (a millisecond timestamp).
- Every add, status change and delete is saved immediately. Status changes edit the existing record and never create a new one.
- Search text and the active filter are not saved.
- On load, stored data is validated. Records missing a title or author are dropped. A missing ID, unknown status or invalid timestamp is repaired. Duplicate IDs are collapsed. Unreadable or non-array data loads as an empty list.
- When anything is dropped or repaired, the original data is first copied to `bookTracker.books.v1.backup`.
- If the browser blocks storage or it is full, the app keeps working for the session and shows a warning that changes will be lost.
- Open tabs stay in sync through the `storage` event.
- Data is kept per browser and per site address. Clearing site data removes it, and it does not move between devices.
