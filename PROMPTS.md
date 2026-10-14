. prompt 1 - I want to build a professional, responsive Book Tracker web app using plain HTML, CSS and JavaScript. Users must be able to add books with a title, author and status (To read, Reading, Finished), view newest books first, search by title or author, update status, and retain data after refresh using localStorage. Include book deletion, status counts, empty states and mobile-friendly styling. Before coding, outline the file structure, data model, UI design and implementation plan. Keep it simple, accessible and dependency-free.
. purpose - set the scope, constraints and architecture before any code was written
. what the ai produced - a written plan (file structure, data model, UI design, implementation steps) and three files: index.html, styles.css, app.js
	 - data stored as a JSON array under bookTracker.books.v1, each book with id, title, author, status and createdAt
	 - inline validation, status count tiles that also work as filters, search, a status dropdown and Delete with a confirm prompt on each card, two empty states, skip link, aria-live 	   announcements, light and dark themes
	 - book text inserted with textContent, never innerHTML

. prompt 2 - Implement reliable localStorage persistence. Load saved books when the app starts and save every addition, status change and deletion. Store each book's unique ID, title, author, status and creation timestamp. Handle missing or invalid stored data safely. Ensure updates modify the existing book rather than creating duplicates, and verify that all changes survive a page refresh.
. purpose - make saving and loading trustworthy, including when stored data is bad
. what the ai produced - a validating loader (corrupt or non-array data loads as an empty list, records with no title or author are dropped, missing IDs, unknown statuses and bad timestamps are repaired, duplicate IDs collapse to one record, long text is clamped to 150 characters for title and 100 for author)
 	- a backup copy at bookTracker.books.v1.backup whenever data is discarded or repaired
 	- saves wrapped in try/catch with a warning banner if storage is blocked or full
 	- status changes edit the record in place, keeping its id and createdAt
 	- unique ID checking, stable sort for books added in the same millisecond, cross-tab sync through the storage event

. prompt 3 - Add a live search field above the book list. Filter books by title or author as the user types, ignoring capitalization and handling leading or trailing spaces. Search must work together with the current list, without deleting or modifying stored books. Show a helpful message when no books match and restore the full list when the search is cleared.
. purpose - check and finish search, including the empty state wording
. what the ai produced - it found search already existed from prompt 1 and only filled the gaps
 	- empty state messages that depend on what is active (search only, status filter only, both together, or empty shelf), each with its own reset button
 	- Escape in the search box clears it
 	- a result summary that mentions the active search, with long search text shortened
 	- the AI checked trimming, case-insensitivity, author search, empty state variants, Escape, restoring the full list, and that localStorage was untouched


. prompt 4 - Improve the Book Tracker into a polished, portfolio-quality product. Use a consistent typography scale, balanced spacing, a refined color palette, attractive book cards, clear status badges, subtle hover and focus states, and responsive layouts for mobile, tablet and desktop. Include a useful empty state, a clear search bar, accessible form errors and intuitive actions. Avoid excessive animations, clutter and unnecessary features. Preserve all existing functionality and test that the layout works at narrow screen widths.
. purpose - make the app look more professional with a consistent type and spacing scale, status styling and responsive layout
. what the ai produced- design tokens with a stone background and teal accent, Georgia for titles, fixed spacing and type scale
 	- cards with a cover tile showing the first letter, a coloured spine and a status badge with the status written out
 	- two column stat tiles on phones, row style cards and a two column form from tablet width, a sticky form sidebar from about 1024px
 	- a search icon with a Clear button, an Add your first book button in the empty state, and a ! marker on form errors
	 - contrast measured in both themes, text and badges pass 4.5:1

. prompt 5 - I found a bug while testing my Book Tracker: it allows duplicate books to be added. For example, "Dune" by "Frank Herbert" can be added again as "dune" by "frank herbert" or with extra spaces in the title or author. I expected the app to block duplicates when both the title and author match, ignoring capitalization and extra spaces. However, books with the same title but different authors, or different titles such as "PSG 1" and "PSG 2", should still be allowed. Identify the cause and implement a reliable fix. Normalize titles and authors by trimming leading and trailing spaces, collapsing repeated spaces, and ignoring capitalization during comparison. Show a clear validation message when a duplicate is detected, without adding or saving it. Ensure the fix works with existing localStorage data and rapid repeated submissions, and does not break search, status updates, deletion, or newest-first ordering. Explain the fix and provide test cases to verify it.
. purpose - fix a real bug I found while testing
. cause - addBook() only checked that title and author were not empty, the only uniqueness check was on the internal id, which is always newly generated, so a second Dune never conflicted
. what the ai produced - normalizeForCompare() that trims, collapses repeated whitespace, applies Unicode NFKC normalisation and lowercases
	- findDuplicate(title, author) that compares both fields against the books in state, which includes books loaded from localStorage
 	- the check runs before anything is pushed or saved, a match shows an inline error naming the existing book and its status and moves focus to the title field
 	- the check is synchronous against live state, so a rapid second submit is compared against the book the first submit just added
 	- the error clears when the user edits either field