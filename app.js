const THEMES = {
    midnight: { dark: 'atom-one-dark', light: 'atom-one-light' },
    breeze:   { dark: 'nord',          light: 'github' },
    candy:    { dark: 'dracula',       light: 'atom-one-light' },
    crimson:  { dark: 'monokai-sublime', light: 'github' },
    sunset:   { dark: 'github-dark',   light: 'github' },
    mono:     { dark: 'github-dark-dimmed', light: 'github' },
};

const HLJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles';

const state = {
    theme: 'midnight',
    darkMode: true,
    lineNumbers: true,
    background: true,
    padding: 32,
    language: 'auto',
    code: '',
    title: 'Untitled-1',
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DEFAULT_CODE = `// Welcome to Code Beauty
// Click here to edit, or press Cmd+V

function greet(name) {
    const message = \`Hello, \${name}!\`;
    console.log(message);
    return message;
}

greet("World");`;

function init() {
    state.code = DEFAULT_CODE;
    renderPreview();
    setupEventListeners();
}

function renderPreview() {
    const codeEl = $('#code-display');

    if (!state.code) {
        codeEl.textContent = '// Click here to start typing...';
        codeEl.className = 'placeholder';
        $('#line-numbers').innerHTML = '<span>1</span>';
        return;
    }

    codeEl.classList.remove('placeholder');

    let result;
    if (state.language === 'auto') {
        result = hljs.highlightAuto(state.code);
    } else {
        try {
            result = hljs.highlight(state.code, { language: state.language });
        } catch {
            result = hljs.highlightAuto(state.code);
        }
    }

    codeEl.innerHTML = result.value;
    codeEl.className = 'hljs';

    renderLineNumbers();
}

function renderLineNumbers() {
    const lines = state.code.split('\n');
    const container = $('#line-numbers');
    container.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
}

function swapThemeCSS() {
    const themeConfig = THEMES[state.theme];
    const cssName = state.darkMode ? themeConfig.dark : themeConfig.light;
    const newHref = `${HLJS_CDN}/${cssName}.min.css`;

    const oldLink = $('#hljs-theme') || document.querySelector('#hljs-theme-new');
    if (oldLink && oldLink.href === newHref) return;

    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.id = 'hljs-theme-new';
    newLink.href = newHref;
    newLink.onload = () => {
        if (oldLink) oldLink.remove();
        newLink.id = 'hljs-theme';
        renderPreview();
    };
    newLink.onerror = () => {
        newLink.remove();
    };
    document.head.appendChild(newLink);
}

function applyTheme() {
    document.body.dataset.theme = state.theme;
    document.body.dataset.dark = state.darkMode;
    swapThemeCSS();
}

function measureCodeDimensions(text) {
    if (!text) return { width: 0, height: 0 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // Must match CSS: font-size 14px, same font stack as #code-display
    ctx.font = '14px "JetBrains Mono", "Fira Code", "Cascadia Code", monospace';
    let maxWidth = 0;
    for (const line of text.split('\n')) {
        const w = ctx.measureText(line).width;
        if (w > maxWidth) maxWidth = w;
    }
    const lineCount = text.split('\n').length;
    return { width: maxWidth, height: lineCount * 14 * 1.65 };
}

async function renderCanvas() {
    await document.fonts.ready;

    const dims = measureCodeDimensions(state.code);
    const el = state.background ? $('#export-wrapper') : $('#code-card');

    // Use pretext-style measured dims as minimum bounds.
    // chromeW/H cover titlebar, code-body padding, line-numbers column, and wrapper padding.
    const chromeW = 120;
    const chromeH = 120;
    const w = Math.max(el.scrollWidth, dims.width + chromeW);
    const h = Math.max(el.scrollHeight, dims.height + chromeH);

    return html2canvas(el, {
        width: w,
        height: h,
        windowWidth: w + 40,
        windowHeight: h + 40,
        scale: 2.8,
        useCORS: true,
        backgroundColor: null,
        logging: false,
    });
}

async function exportImage() {
    const btn = $('#export-btn');
    btn.classList.add('exporting');
    const origHTML = btn.innerHTML;
    btn.textContent = 'Exporting...';

    try {
        exitEditMode();
        const canvas = await renderCanvas();
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.title || 'code'}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (err) {
        console.error('Export failed:', err);
    } finally {
        btn.classList.remove('exporting');
        btn.innerHTML = origHTML;
    }
}

async function copyImageToClipboard() {
    const btn = $('#copy-btn');
    const origHTML = btn.innerHTML;

    try {
        exitEditMode();
        const canvas = await renderCanvas();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return;

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        btn.classList.add('copied');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origHTML;
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        btn.textContent = 'Copy failed';
        setTimeout(() => { btn.innerHTML = origHTML; }, 2000);
    }
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            state.code = text.replace(/\t/g, '    ');
            renderPreview();
            $('#code-input').value = state.code;
        }
    } catch {
        enterEditMode();
    }
}

function enterEditMode() {
    const area = $('.code-area');
    const input = $('#code-input');
    area.classList.add('editing');
    input.value = state.code;
    input.focus();
}

function exitEditMode() {
    const area = $('.code-area');
    area.classList.remove('editing');
}


function setupEventListeners() {
    $('#paste-btn').addEventListener('click', pasteFromClipboard);
    $('#copy-btn').addEventListener('click', copyImageToClipboard);
    $('#export-btn').addEventListener('click', exportImage);

    $('#theme-select').addEventListener('change', (e) => {
        state.theme = e.target.value;
        applyTheme();
    });

    $('#dark-toggle').addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        $('#dark-toggle').classList.toggle('active', state.darkMode);
        $('#dark-toggle').setAttribute('aria-pressed', state.darkMode);
        applyTheme();
    });

    $('#bg-toggle').addEventListener('click', () => {
        state.background = !state.background;
        $('#bg-toggle').classList.toggle('active', state.background);
        $('#bg-toggle').setAttribute('aria-pressed', state.background);
        $('#export-wrapper').classList.toggle('no-bg', !state.background);
    });

    $('#lines-toggle').addEventListener('click', () => {
        state.lineNumbers = !state.lineNumbers;
        $('#lines-toggle').classList.toggle('active', state.lineNumbers);
        $('#lines-toggle').setAttribute('aria-pressed', state.lineNumbers);
        $('#line-numbers').classList.toggle('hidden', !state.lineNumbers);
    });

    $$('[data-padding]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.padding = parseInt(btn.dataset.padding);
            $$('[data-padding]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.documentElement.style.setProperty('--card-padding', `${state.padding}px`);
        });
    });

    $('#language-select').addEventListener('change', (e) => {
        state.language = e.target.value;
        renderPreview();
    });

    $('.code-area').addEventListener('click', (e) => {
        if (!$('.code-area').classList.contains('editing')) {
            enterEditMode();
        }
    });

    $('#code-input').addEventListener('input', (e) => {
        state.code = e.target.value;
        renderPreview();
    });

    $('#code-input').addEventListener('blur', () => {
        exitEditMode();
    });

    document.addEventListener('mousedown', (e) => {
        const area = $('.code-area');
        if (area.classList.contains('editing') && !area.contains(e.target)) {
            exitEditMode();
        }
    });

    $('#code-input').addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            e.target.value = e.target.value.substring(0, start) + '    ' + e.target.value.substring(end);
            e.target.selectionStart = e.target.selectionEnd = start + 4;
            state.code = e.target.value;
            renderPreview();
            }
        if (e.key === 'Escape') {
            e.target.blur();
        }
    });

    $('.window-title').addEventListener('input', (e) => {
        state.title = e.target.textContent.trim();
    });

    $('.window-title').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });

    document.addEventListener('paste', (e) => {
        if (e.target === $('#code-input')) return;
        if (e.target.closest('.window-title')) return;

        e.preventDefault();
        const text = e.clipboardData.getData('text');
        if (text) {
            state.code = text.replace(/\t/g, '    ');
            renderPreview();
            $('#code-input').value = state.code;
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
