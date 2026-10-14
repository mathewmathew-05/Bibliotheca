(() => {
  'use strict';

  /* ---------- Constants ---------- */
  const STORAGE_KEY = 'bookTracker.books.v1';

  const STATUSES = [
    { value: 'to-read', label: 'To read' },
    { value: 'reading', label: 'Reading' },
    { value: 'finished', label: 'Finished' },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

  /* ---------- DOM references ---------- */
  const $ = (selector) => document.querySelector(selector);

  const els = {
    form: $('#book-form'),
    title: $('#title'),
    author: $('#author'),
    status: $('#status'),
    titleError: $('#title-error'),
    authorError: $('#author-error'),
    search: $('#search'),
    list: $('#book-list'),
    template: $('#book-template'),
    empty: $('#empty-state'),
    emptyTitle: $('#empty-title'),
    emptyText: $('#empty-text'),
    emptyReset: $('#empty-reset'),
    summary: $('#result-summary'),
    heading: $('#library-heading'),
    message: $('#status-message'),
    storageWarning: $('#storage-warning'),
    filters: document.querySelectorAll('[data-filter]'),
    counts: document.querySelectorAll('[data-count]'),
  };

  /* ---------- Storage ---------- */
  const BACKUP_KEY = STORAGE_KEY + '.backup';
  const MAX_TITLE = 150;
  const MAX_AUTHOR = 100;

  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  // Turn one stored record into a valid book, repairing what can be repaired.
  // Returns null when the record is unusable (not an object, or no title/author).
  function normalizeBook(raw, fallbackTime) {
    if (!isPlainObject(raw)) return null;

    const title = typeof raw.title === 'string' ? clean(raw.title).slice(0, MAX_TITLE) : '';
    const author = typeof raw.author === 'string' ? clean(raw.author).slice(0, MAX_AUTHOR) : '';
    if (!title || !author) return null;

    return {
      id: typeof raw.id === 'string' && raw.id.trim() !== '' ? raw.id : newId(),
      title,
      author,
      status: Object.prototype.hasOwnProperty.call(STATUS_LABEL, raw.status) ? raw.status : 'to-read',
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : fallbackTime,
    };
  }

  // Keep a copy of data we had to discard or fix, so nothing is silently lost.
  function backUpRaw(raw) {
    try { localStorage.setItem(BACKUP_KEY, raw); } catch (err) { /* best effort */ }
  }

  // Returns { books, repaired }. Never throws.
  function loadBooks() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      els.storageWarning.hidden = false; // storage blocked entirely
      return { books: [], repaired: false };
    }
    if (raw === null) return { books: [], repaired: false };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      backUpRaw(raw);
      return { books: [], repaired: true };
    }
    if (!Array.isArray(parsed)) {
      backUpRaw(raw);
      return { books: [], repaired: true };
    }

    const seenIds = new Set();
    const books = [];
    let repaired = false;
    const now = Date.now();

    parsed.forEach((item, index) => {
      const book = normalizeBook(item, now - (parsed.length - index));
      if (!book || seenIds.has(book.id)) { // unusable record, or a duplicate ID
        repaired = true;
        return;
      }
      if (JSON.stringify(item) !== JSON.stringify(book)) repaired = true;
      seenIds.add(book.id);
      books.push(book);
    });

    if (repaired) backUpRaw(raw);
    return { books, repaired };
  }

  // Returns true when the write succeeded.
  function saveBooks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.books));
      els.storageWarning.hidden = true;
      return true;
    } catch (err) {
      els.storageWarning.hidden = false;
      return false;
    }
  }

  /* ---------- State ---------- */
  const state = {
    books: [],
    query: '',
    filter: 'all', // 'all' | 'to-read' | 'reading' | 'finished'
  };

  /* ---------- Helpers ---------- */
  const clean = (value) => value.replace(/\s+/g, ' ').trim();

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function uniqueId() {
    let id;
    do { id = newId(); } while (state.books.some((b) => b.id === id));
    return id;
  }

  function announce(text) {
    // Clear first so repeated identical messages are still announced.
    els.message.textContent = '';
    window.setTimeout(() => { els.message.textContent = text; }, 50);
  }

  // Shorten long text for display in messages.
  function shorten(text, max) {
    return text.length > max ? text.slice(0, max - 1) + '\u2026' : text;
  }

  function pluralBooks(n) {
    return n === 1 ? '1 book' : n + ' books';
  }

  function populateStatusOptions(select) {
    STATUSES.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function countByStatus() {
    const counts = { all: state.books.length, 'to-read': 0, reading: 0, finished: 0 };
    state.books.forEach((b) => { counts[b.status] += 1; });
    return counts;
  }

  function getVisibleBooks() {
    const q = state.query.toLowerCase();
    return state.books
      .map((book, index) => ({ book, index }))
      .filter(({ book: b }) => state.filter === 'all' || b.status === state.filter)
      .filter(({ book: b }) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .sort((x, y) => (y.book.createdAt - x.book.createdAt) || (y.index - x.index)) // newest first
      .map(({ book }) => book);
  }

  /* ---------- Rendering ---------- */
  function createBookItem(book) {
    const item = els.template.content.firstElementChild.cloneNode(true);
    item.dataset.id = book.id;
    item.dataset.status = book.status;

    item.querySelector('.book-title').textContent = book.title;
    item.querySelector('.book-author').textContent = 'by ' + book.author;

    const select = item.querySelector('.status-select');
    populateStatusOptions(select);
    select.value = book.status;
    select.setAttribute('aria-label', 'Status for ' + book.title);

    item.querySelector('.delete-btn').setAttribute('aria-label', 'Delete ' + book.title);

    return item;
  }

  function render() {
    // Counts and filter buttons
    const counts = countByStatus();
    els.counts.forEach((el) => { el.textContent = counts[el.dataset.count]; });
    els.filters.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
    });

    // List
    const visible = getVisibleBooks();
    els.list.replaceChildren(...visible.map(createBookItem));

    // Empty states
    const hasBooks = state.books.length > 0;
    const isEmpty = visible.length === 0;
    els.list.hidden = isEmpty;
    els.empty.hidden = !isEmpty;

    if (isEmpty) {
      const hasQuery = state.query !== '';
      const hasFilter = state.filter !== 'all';
      const filterLabel = STATUS_LABEL[state.filter];
      const quoted = '\u201C' + shorten(state.query, 40) + '\u201D';

      if (!hasBooks) {
        els.emptyTitle.textContent = 'Your shelf is empty';
        els.emptyText.textContent = 'Add your first book using the form above.';
        els.emptyReset.hidden = true;
      } else if (hasQuery && hasFilter) {
        els.emptyTitle.textContent = 'No \u201C' + filterLabel + '\u201D books match ' + quoted;
        els.emptyText.textContent = 'Check the spelling, try fewer words, or clear the search and filter to see every book.';
        els.emptyReset.textContent = 'Clear search and filter';
        els.emptyReset.hidden = false;
      } else if (hasQuery) {
        els.emptyTitle.textContent = 'No books match ' + quoted;
        els.emptyText.textContent = 'Check the spelling or try part of the title or author\u2019s name.';
        els.emptyReset.textContent = 'Clear search';
        els.emptyReset.hidden = false;
      } else {
        els.emptyTitle.textContent = 'No books marked \u201C' + filterLabel + '\u201D';
        els.emptyText.textContent = 'Change a book\u2019s status, or add a new book with this status.';
        els.emptyReset.textContent = 'Show all books';
        els.emptyReset.hidden = false;
      }
    }

    // Result summary (announced politely as people search or filter)
    if (!hasBooks) {
      els.summary.textContent = '';
    } else if (visible.length === state.books.length) {
      els.summary.textContent = 'Showing all ' + pluralBooks(visible.length);
    } else {
      els.summary.textContent = 'Showing ' + visible.length + ' of ' + pluralBooks(state.books.length) +
        (state.query ? ' matching \u201C' + shorten(state.query, 30) + '\u201D' : '');
    }
  }

  /* ---------- Form handling ---------- */
  function setFieldError(input, errorEl, message) {
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  function addBook(event) {
    event.preventDefault();

    const title = clean(els.title.value);
    const author = clean(els.author.value);

    setFieldError(els.title, els.titleError, title ? '' : 'Enter a title.');
    setFieldError(els.author, els.authorError, author ? '' : 'Enter an author.');

    if (!title || !author) {
      (title ? els.author : els.title).focus();
      return;
    }

    state.books.push({
      id: uniqueId(),
      title,
      author,
      status: els.status.value,
      createdAt: Date.now(),
    });
    saveBooks();

    // Reset search and filter so the new book is visible at the top.
    state.query = '';
    state.filter = 'all';
    els.search.value = '';
    els.form.reset();
    render();
    els.title.focus();
    announce('Added ' + title + ' by ' + author + '.');
  }

  /* ---------- List actions ---------- */
  function findBookFromEvent(event, selector) {
    const control = event.target.closest(selector);
    if (!control) return null;
    const item = control.closest('.book');
    const book = item && state.books.find((b) => b.id === item.dataset.id);
    return book ? { control, book } : null;
  }

  function onStatusChange(event) {
    const found = findBookFromEvent(event, '.status-select');
    if (!found) return;
    const { control, book } = found;

    if (!Object.prototype.hasOwnProperty.call(STATUS_LABEL, control.value) || control.value === book.status) {
      control.value = book.status;
      return;
    }

    book.status = control.value; // mutate the existing record; never add a new one
    saveBooks();
    render();

    // Keep keyboard focus on the same book if it's still in the list.
    const row = Array.from(els.list.children).find((li) => li.dataset.id === book.id);
    const next = row && row.querySelector('.status-select');
    if (next) {
      next.focus();
      announce(book.title + ' marked as ' + STATUS_LABEL[book.status] + '.');
    } else {
      // The book no longer matches the current filter or search, so its
      // control is gone. Move focus somewhere sensible and say what happened.
      els.heading.focus();
      announce(book.title + ' marked as ' + STATUS_LABEL[book.status] +
        ' and moved out of the current view.');
    }
  }

  function onDeleteClick(event) {
    const found = findBookFromEvent(event, '.delete-btn');
    if (!found) return;
    const { book } = found;

    if (!window.confirm('Delete "' + book.title + '" by ' + book.author + '? This can\'t be undone.')) {
      return;
    }

    state.books = state.books.filter((b) => b.id !== book.id);
    saveBooks();
    render();
    els.heading.focus(); // the deleted button no longer exists
    announce('Deleted ' + book.title + '.');
  }

  /* ---------- Search and filters ---------- */
  // Leading/trailing/repeated spaces are ignored; the stored books are never touched.
  function onSearchInput() {
    state.query = clean(els.search.value);
    render();
  }

  function onSearchKeydown(event) {
    if (event.key === 'Escape' && els.search.value !== '') {
      event.preventDefault();
      els.search.value = '';
      state.query = '';
      render();
    }
  }

  function onFilterClick(event) {
    state.filter = event.currentTarget.dataset.filter;
    render();
  }

  function resetSearchAndFilter() {
    state.query = '';
    state.filter = 'all';
    els.search.value = '';
    render();
    els.search.focus();
  }

  /* ---------- Init ---------- */
  populateStatusOptions(els.status);

  const loaded = loadBooks();
  state.books = loaded.books;
  if (loaded.repaired) saveBooks(); // write back the cleaned list (raw copy is in BACKUP_KEY)

  els.form.addEventListener('submit', addBook);
  els.title.addEventListener('input', () => setFieldError(els.title, els.titleError, ''));
  els.author.addEventListener('input', () => setFieldError(els.author, els.authorError, ''));

  els.search.addEventListener('input', onSearchInput);
  els.search.addEventListener('keydown', onSearchKeydown);
  els.filters.forEach((btn) => btn.addEventListener('click', onFilterClick));
  els.emptyReset.addEventListener('click', resetSearchAndFilter);

  els.list.addEventListener('change', onStatusChange);
  els.list.addEventListener('click', onDeleteClick);

  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      state.books = loadBooks().books;
      render();
    }
  });

  render();
})();