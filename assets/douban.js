(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const make = (tag, className, text) => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    };
    let data, matched;
    const storageKey = 'douban:257515089:unwanted:v1';
    let unwanted = {movie: [], book: []};
    function validatePreferences(value) {
        if (!value || !['movie', 'book'].every(kind => Array.isArray(value[kind]) && value[kind].every(id => typeof id === 'string' && /^\d+$/.test(id)))) throw new Error('Invalid preferences');
        return {movie: [...new Set(value.movie)], book: [...new Set(value.book)]};
    }
    function savePreferences(next) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
            unwanted = next;
            cards(); collection();
            return true;
        } catch (error) {
            $('preferences-status').textContent = '保存失败：浏览器存储不可用或已满，请启用本地存储后重试。';
            return false;
        }
    }
    function setupPreferences() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) unwanted = validatePreferences(JSON.parse(saved));
        } catch (error) {
            $('preferences-status').textContent = '无法读取已保存的选择；请检查浏览器存储或导入备份。';
        }
        $('export-preferences').addEventListener('click', () => {
            const file = {version: 1, user_id: data.user_id, unwanted};
            const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'}));
            const link = make('a'); link.href = url; link.download = 'douban-preferences.json';
            document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            $('preferences-status').textContent = '已导出当前选择。';
        });
        $('import-preferences').addEventListener('click', () => $('preferences-file').click());
        $('preferences-file').addEventListener('change', async event => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                if (file.size > 1024 * 1024) throw new Error('File too large');
                const backup = JSON.parse(await file.text());
                if (backup.version !== 1 || backup.user_id !== data.user_id) throw new Error('Wrong backup');
                const imported = validatePreferences(backup.unwanted);
                const next = {};
                for (const kind of ['movie', 'book']) next[kind] = [...new Set([...unwanted[kind], ...imported[kind]])];
                if (savePreferences(next)) $('preferences-status').textContent = '已导入并合并选择，原有标记已保留。';
            } catch (error) { $('preferences-status').textContent = '导入失败，请选择此页面导出的有效备份文件。'; }
            event.target.value = '';
        });
    }
    function cards() {
        $('progress-cards').replaceChildren();
        for (const [kind, label, verb] of [['movie', '电影', '看过'], ['book', '书籍', '读过']]) {
            const count = matched[kind].length;
            const card = make('article', `progress-card ${kind}`);
            card.append(make('p', 'eyebrow', kind === 'movie' ? '01 / CINEMA' : '02 / LIBRARY'), make('h2', '', `Top250 ${label}`));
            const number = make('p', 'progress-number', count);
            number.append(make('small', '', ' / 250'));
            const progress = make('progress'); progress.max = 250; progress.value = count; progress.setAttribute('aria-label', `${label}已完成 ${count} / 250`);
            const detail = make('div', 'card-detail');
            detail.append(make('span', '', `完成 ${(count / 250 * 100).toFixed(1)}%`), make('span', '', `还剩 ${250 - count} ${kind === 'movie' ? '部' : '本'}`));
            card.append(number, progress, detail, make('p', 'card-note', `豆瓣全部${verb}记录 ${data.categories[kind].records.length} 条 · 按条目 ID 匹配`));
            const completed = new Set(matched[kind].map(r => r.id));
            const skipped = data.categories[kind].top250.filter(r => unwanted[kind].includes(r.id) && !completed.has(r.id)).length;
            if (skipped) card.append(make('p', 'card-note', `${skipped} ${kind === 'movie' ? '部暂不想看' : '本暂不想读'} · 不计入完成数`));
            $('progress-cards').append(card);
        }
    }
    function collection() {
        const kind = $('category').value;
        const records = new Map(data.categories[kind].records.map(r => [r.id, r]));
        const query = $('search').value.trim().toLocaleLowerCase();
        const entries = data.categories[kind].top250.filter(entry => {
            const record = records.get(entry.id);
            const skipped = unwanted[kind].includes(entry.id) && !record;
            const state = $('completion').value;
            return (state === 'all' || (state === 'done' && record) || (state === 'todo' && !record && !skipped) || (state === 'unwanted' && skipped)) &&
                entry.title.toLocaleLowerCase().includes(query);
        });
        $('collection').replaceChildren(); $('list-count').textContent = `${entries.length} / 250 项`;
        for (const entry of entries) {
            const record = records.get(entry.id);
            const skipped = unwanted[kind].includes(entry.id) && !record;
            const row = make('div', 'collection-row');
            const detail = make('div'); const link = make('a', 'work-title', entry.title);
            link.href = `https://${kind}.douban.com/subject/${entry.id}/`; link.target = '_blank'; link.rel = 'noopener noreferrer';
            detail.append(link);
            if (record && record.rating) detail.append(make('p', 'work-meta', `我的评分 ${'★'.repeat(record.rating)}`));
            const actions = make('div', 'row-actions');
            actions.append(make('span', `badge ${record ? 'done' : ''}`, record ? (kind === 'movie' ? '已看' : '已读') : skipped ? (kind === 'movie' ? '不想看' : '不想读') : '待完成'));
            if (!record) {
                const button = make('button', 'preference-toggle', skipped ? '恢复待完成' : kind === 'movie' ? '不想看' : '不想读');
                button.type = 'button'; button.setAttribute('aria-pressed', String(skipped));
                button.setAttribute('aria-label', `${entry.title}：${button.textContent}`);
                button.addEventListener('click', () => {
                    const next = {...unwanted, [kind]: skipped ? unwanted[kind].filter(id => id !== entry.id) : [...unwanted[kind], entry.id]};
                    if (savePreferences(next)) $('preferences-status').textContent = `${entry.title}：${skipped ? '已恢复待完成' : '已保存选择'}。`;
                });
                actions.append(button);
            }
            row.append(make('span', 'rank', String(entry.rank).padStart(3, '0')), detail, actions);
            $('collection').append(row);
        }
        if (!entries.length) $('collection').append(make('p', 'empty', '没有符合筛选条件的作品，试试其他状态或关键词。'));
    }
    async function init() {
        try {
            const response = await fetch('assets/douban.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            data = await response.json();
            matched = {};
            for (const kind of ['movie', 'book']) {
                const ids = new Set(data.categories[kind].top250.map(r => r.id));
                if (ids.size !== 250) throw new Error('Incomplete Top250 snapshot');
                matched[kind] = data.categories[kind].records.filter(r => ids.has(r.id));
            }
            $('updated').textContent = `数据更新于 ${data.updated_at.slice(0, 10)} · 上海时间`;
            setupPreferences(); cards(); collection(); $('tracker').hidden = false;
            ['category', 'completion'].forEach(id => $(id).addEventListener('change', collection));
            $('search').addEventListener('input', collection);
        } catch (error) {
            $('updated').textContent = '快照暂时不可用';
            $('load-status').hidden = false;
            $('load-status').textContent = '无法读取完整数据，请稍后重试。可通过上方链接查看豆瓣记录。';
            console.error('Douban tracker:', error);
        }
    }
    init();
})();
