// Independent TV/movie state; shared native UI and cloud request contracts.
['tv', 'movie'].forEach(type => {
  const prefix = '[光鸭自定义]';
  const isMovie = type === 'movie', mediaName = isMovie ? '电影' : '剧集', unit = isMovie ? '部' : '集';
  const dialogId = `guangya-${type}-dialog`;
  const configId = isMovie ? 'guangya-movie-tmdb-config-dialog' : 'guangya-tmdb-config-dialog';
  const key = isMovie ? '__guangyaMovie' : '__guangyaTv';
  window[key]?.destroy();
  let nativeRequire, view, configurationView, busy = false, stopping = false, destroyed = false;
  const defaultFields = isMovie ? ['影片名', '上映时间', '分辨率', '视频编码', '音频编码', '来源', 'TMDB'] : ['剧集名', '季集信息', '上映时间', '分辨率', '来源', '视频编码', '音频编码'];
  const allowedFields = [...new Set([...defaultFields, 'TMDB'])];
  const storageKey = 'guangya-assistant-tmdb-key';
  const video = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|m2ts|mts|rmvb|rm|mpg|mpeg|vob|3gp|iso)$/i;
  const validName = name => typeof name === 'string' && !!name.trim() && name === name.trim() && !/[<>:"/\\|?*\x00-\x1f]/.test(name) && !/[. ]$/.test(name) && name !== '.' && name !== '..';
  const idOf = file => String(file?.fileId ?? file?.id ?? '');
  const nameOf = file => String(file?.fileName ?? file?.name ?? '');
  function stripMovieSiteTags(value) {
    return String(value || '').replace(/(?:【[^】]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^】]*】|\[[^\]]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^\]]*\]|『[^』]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^』]*』)/ig, ' ');
  }

  function extractMovieTitleHint(value) {
    const source = stripMovieSiteTags(value).replace(/【[^】]*】/g, ' ');
    const text = source.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)|『[^』]*』|「[^」]*」/g, ' ');
    const chinese = text.match(/(?:[A-Za-z\d]{1,10}\s*(?:[：:]\s*)?)?[\u4e00-\u9fff][\u4e00-\u9fffA-Za-z·\d：:！!？?，,、&]*(?:\s+(?:\d+\s*)?[\u4e00-\u9fff][\u4e00-\u9fffA-Za-z·\d：:！!？?，,、&]*)*/g)?.map(item => item.split(/\s+/).filter(part => !/(?:高清|剧集|发布|国语|配音|字幕|音轨|全集|更新|视频|帧率|版本|杜比|视界|高码|蓝光|原盘|码率|内嵌|简繁|中字|特效)/.test(part)).join(' ')).filter(item => item.length > 1) || [];
    if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
    const bracketTitles = [...source.matchAll(/\[([^\]]+)\]|（([^）]+)）|\(([^)]+)\)/g)].map(match => (match[1] || match[2] || match[3] || '').trim()).filter(title => title && !/(?:国语|国粤|配音|字幕|音轨|多音|中字|杜比|HDR|画质|高码|码率|版本|蓝光|原盘|UHD|4K|HQ|DV|Audio)/i.test(title) && !/^(?:全?\d+集|(?:19|20)\d{2}|\d{3,4}p|s\d{1,2}e?\d{0,3})$/i.test(title));
    return bracketTitles[0] || '';
  }

  function extractMovieEnglishTitle(value) {
    const source = stripMovieSiteTags(value).replace(/\{[^}]*\}/g, ' ');
    const extensionMatch = source.match(/\.(?:3g2|3gp|asf|avi|flv|m2ts|m4v|mkv|mov|mp4|mpeg|mpg|ts|webm|wmv)\s*$/i);
    const base = extensionMatch ? source.slice(0, -extensionMatch[0].length) : source;
    const yearMatch = [...base.matchAll(/(?:19|20)\d{2}/g)].filter(match => Number(match[0]) <= new Date().getFullYear() + 1).at(-1);
    const beforeYear = yearMatch ? base.slice(0, yearMatch.index) : base;
    const clean = beforeYear.replace(/【[^】]*】|\[[^\]]*\]|『[^』]*』|（[^）]*）|\([^)]*\)|\{[^}]*\}/g, ' ');
    const tokens = clean.replace(/[._-]+/g, ' ').split(/\s+/).map(token => token.trim()).filter(token => /^(?:[A-Za-z][A-Za-z0-9']*|\d{1,3})$/.test(token) && !/^(?:2160p?|1080p?|720p?|540p?|4k|8k|web|dl|rip|webrip|bluray|bdrip|bdremux|remux|hdr(?:10\+?)?|dovi|dv|hevc|x265|h265|x264|h264|aac|dts(?:[ ._-]?hd)?(?:[ ._-]?ma)?|truehd|atmos|ddp?|eac3|proper|repack|extended|uncut|limited|complete|multi|subbed|dubbed)$/i.test(token));
    return tokens.join(' ').trim();
  }

  function extractMovieSource(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    if (/(?:^|[.\s_-])web[.\s_-]?dl(?:$|[.\s_-])/i.test(text)) return 'WEB-DL';
    if (/(?:^|[.\s_-])(?:blu[.\s_-]?ray|bdrip|bdremux)(?:$|[.\s_-])/i.test(text)) return 'BluRay';
    return '';
  }

  function extractMovieResolution(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const match = text.match(/(?:^|[.\s_-])(2160|1080|720|540)p(?:$|[.\s_-])/i);
    if (match) return match[1] + 'p';
    return /(?:^|[.\s_-])4k(?:$|[.\s_-])/i.test(text) ? '2160p' : '';
  }

  function extractMovieVideoCodec(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    if (/(?:^|[.\s_-])(?:hevc|hecv|x[.\s_-]?265|h[.\s_-]?265)(?:$|[.\s_-])/i.test(text)) return 'H265';
    if (/(?:^|[.\s_-])(?:avc|x[.\s_-]?264|h[.\s_-]?264)(?:$|[.\s_-])/i.test(text)) return 'H264';
    return '';
  }

  function extractMovieDynamicRange(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const hasDv = /(?:dolby[.\s_-]?vision|(?:^|[.\s_-])(?:dv|dovi)(?:$|[.\s_-]))/i.test(text);
    const hasHdr = /(?:^|[.\s_-])hdr(?:10\+?)?(?:$|[.\s_-])/i.test(text);
    if (hasDv && hasHdr) return 'DV.HDR';
    if (hasDv) return 'DV';
    return hasHdr ? 'HDR' : 'SDR';
  }

  function extractMovieFrameRate(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const match = text.match(/(?:^|[.\s_-])(\d{2,3})[.\s_-]?fps(?:$|[.\s_-])/i);
    return match ? match[1] + 'fps' : '';
  }

  function extractMovieAudioCodec(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.').replace(/([a-z])(?=\d)/ig, '$1.');
    let codec = '';
    if (/(?:^|[.\s_-])true[.\s_-]?hd(?:$|[.\s_-])/i.test(text)) codec = 'TrueHD';
    else if (/(?:^|[.\s_-])dts[.\s_-]?hd[.\s_-]?ma(?:$|[.\s_-])/i.test(text)) codec = 'DTS-HD.MA';
    else if (/(?:^|[.\s_-])dts[.\s_-]?x(?:$|[.\s_-])/i.test(text)) codec = 'DTS-X';
    else if (/(?:^|[.\s_-])dts(?:$|[.\s_-])/i.test(text)) codec = 'DTS';
    else if (/(?:^|[.\s_-])(?:ddp|e[.\s_-]?ac[.\s_-]?3|dd\+)(?:$|[.\s_-])/i.test(text)) codec = 'DDP';
    else if (/(?:^|[.\s_-])(?:dd|ac[.\s_-]?3)(?:$|[.\s_-])/i.test(text)) codec = 'DD';
    else if (/(?:^|[.\s_-])aac(?:$|[.\s_-])/i.test(text)) codec = 'AAC';
    else if (/(?:^|[.\s_-])flac(?:$|[.\s_-])/i.test(text)) codec = 'FLAC';
    else if (/(?:^|[.\s_-])(?:l?pcm)(?:$|[.\s_-])/i.test(text)) codec = 'PCM';
    if (!codec) return '';
    const channels = text.match(/(?:^|[.\s_-])(\d[.]\d)(?:$|[.\s_-])/);
    const atmos = /(?:^|[.\s_-])atmos(?:$|[.\s_-])/i.test(text);
    return codec + (channels ? channels[1] : '') + (atmos ? '.Atmos' : '');
  }

  function parseMediaTags(value) {
    return {
      source: extractMovieSource(value),
      resolution: extractMovieResolution(value),
      videoCodec: extractMovieVideoCodec(value),
      dynamicRange: extractMovieDynamicRange(value),
      frameRate: extractMovieFrameRate(value),
      audioCodec: extractMovieAudioCodec(value),
      hq: /高码版|(?:^|[.\s_-])hq(?:$|[.\s_-])/i.test(value) ? 'HQ' : '',
    };
  }

  function normalizeMovieText(value) {
    return String(value || '').toLowerCase().replace(/[._·:：!！?？,，、/\\()[\]{}【】「」"'’‘-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function extractTvSeasonEpisode(value) {
    const text = String(value || '').replace(/[【】[\](){}]/g, '.');
    const match = text.match(/(?:^|[.\s_-])s(\d{1,2})[.\s_-]?e(\d{1,3})(?:[.\s_-]+part[.\s_-]?(\d+))?(?:$|[.\s_-])/i);
    if (!match) return { season: '', episode: '', label: '' };
    const season = String(Number(match[1])).padStart(2, '0');
    const episode = String(Number(match[2])).padStart(2, '0');
    const part = match[3] ? 'Part' + Number(match[3]) : '';
    return { season, episode, part, label: 'S' + season + 'E' + episode + (part ? '.' + part : '') };
  }

  function extractTvTitle(value) {
    const source = stripMovieSiteTags(value).replace(/【[^】]*】/g, ' ');
    const text = source.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)|『[^』]*』|「[^」]*」/g, ' ').replace(/(?:^|[.\s_-])s\d{1,2}(?:[.\s_-]?e\d{1,3})?(?:$|[.\s_-]).*$/i, ' ');
    const chinese = text.match(/[\u4e00-\u9fff][\u4e00-\u9fff\u2160-\u217f·\d：]*/g)?.map(item => item.trim()).filter(item => item.length > 1 && !/(?:高清|剧集|发布|国语|配音|字幕|音轨|全集|更新|视频|帧率|版本|杜比|视界|高码|蓝光|原盘|码率|内嵌|简繁|中字|特效)/.test(item)) || [];
    if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
    return extractMovieTitleHint(source) || extractMovieEnglishTitle(text).replace(/\b(?:19|20)\d{2}\b.*$/, '').trim();
  }

  function getPreferredMediaTitle(info, match) {
    const searchTitle = (info?.title === match?.title || info?.title === match?.originalTitle) ? info?.title : null;
    const localizedTitle = [match?.title, match?.originalTitle, match?.chineseTitle].find(value => /[\u3400-\u9fff]/.test(String(value || '')));
    return String(localizedTitle || searchTitle || match?.chineseTitle || match?.originalTitle || match?.title || info?.title || '').replace(/[\\/:*?"<>|]/g, '').trim();
  }

  function parseTmdbId(...names) {
    const ids = [...new Set(names.flatMap(name => [...String(name || '').matchAll(/(?<![a-z0-9])tmdb(?:id)?-([1-9]\d*)(?![a-z0-9])/ig)].map(match => match[1]).filter(id => Number.isSafeInteger(Number(id)))))];
    return { tmdbId: ids.length === 1 ? ids[0] : '', tmdbError: ids.length > 1 ? '发现多个不同的 TMDB ID，请手动纠错' : '' };
  }

  function parseEpisode(name, folderName = '') {
    const own = extractTvSeasonEpisode(name);
    const parsed = own.label ? own : extractTvSeasonEpisode(folderName);
    const extension = name.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
    const yearText = folderName + ' ' + name;
    const year = yearText.match(/[（(]\s*((?:19|20)\d{2})\s*[）)]/)?.[1]
      || yearText.match(/(?:^|[.\s_\-\[【])((?:19|20)\d{2})(?=$|[.\s_\-\]】])/)?.[1] || '';
    return { ...parsed, seasonEpisode: parsed.label, title: extractTvTitle(folderName) || extractTvTitle(name),
      year, ...parseTmdbId(name, folderName),
      extension, ...parseMediaTags(name + '.' + folderName) };
  }

  function parseMovie(name, path = []) {
    const source = stripMovieSiteTags(name);
    const extension = name.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
    const base = source.replace(/\.[^.]+$/, '');
    const yearMatch = [...base.matchAll(/(?<!\d)(?:19|20)\d{2}(?!\d)/g)].filter(match => Number(match[0]) <= new Date().getFullYear() + 1).at(-1);
    const beforeYear = yearMatch ? base.slice(0, yearMatch.index) : base;
    const fileTitle = extractMovieTitleHint(beforeYear) || extractMovieEnglishTitle(name);
    const parent = path.at(-1) || '';
    const genericParent = /合集|系列|全集|collection|^(?:电影|影视|视频|资源|下载|新建文件夹|来自云添加)$/i.test(parent);
    const parentTitle = genericParent ? '' : extractMovieTitleHint(parent) || extractMovieEnglishTitle(parent);
    const genericFile = /^(?:video|movie|main|feature|正片|电影|视频|\d+)$/i.test(fileTitle);
    return { title: ((!fileTitle || genericFile) ? parentTitle : fileTitle) || fileTitle,
      year: yearMatch?.[0] || parent.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/)?.[0] || '',
      ...parseTmdbId(name, parent),
      extension, ...parseMediaTags([name, ...path.slice().reverse()].join('.')) };
  }

  function namingFields(value = defaultFields) {
    const fields = Array.isArray(value) ? [...value] : String(value).split(/[,，]/).map(part => part.trim()).filter(Boolean);
    const required = isMovie ? ['影片名'] : ['剧集名', '季集信息'];
    if (required.some(field => !fields.includes(field)) || fields.some(field => !allowedFields.includes(field)) || new Set(fields).size !== fields.length) throw Error(`命名字段无效；必须包含${required.join('、')}，字段不能重复`);
    return fields;
  }

  function makePlan(groups, rule = defaultFields) {
    const fields = namingFields(rule), items = [], targets = new Map(), ids = new Set();
    for (const group of groups) {
      const match = group.match;
      const title = match ? getPreferredMediaTitle(group.info, match) : '';
      const folderName = match ? [title, match.year ? `(${match.year})` : '', `{tmdb-${match.id}}`].filter(Boolean).join(' ') : '';
      group.folderName = folderName;
      for (const entry of group.entries) {
        const info = entry.info;
        const seasonYear = group.seasons?.find(season => Number(season.season_number) === Number(info.season))?.air_date?.slice(0, 4);
        const values = { 影片名: title, 剧集名: title, 季集信息: info.label, 上映时间: seasonYear || match?.year || info.year,
          分辨率: info.resolution, 来源: info.source, 视频编码: info.videoCodec ? [info.videoCodec, info.hq, info.dynamicRange, info.frameRate].filter(Boolean).join('.') : '',
          音频编码: info.audioCodec, TMDB: match ? `{tmdb-${match.id}}` : '' };
        const newName = match && (isMovie || info.label) ? fields.map(field => values[field]).filter(Boolean).join('.') + info.extension : '';
        const seasonName = isMovie ? '' : `Season ${Number(info.season || 1)}`;
        let error = !match ? '未匹配 TMDB' : !isMovie && !info.label ? '缺少 SxxExx 季集信息' : '';
        if (!idOf(entry.file) || ids.has(idOf(entry.file))) error = '文件编号缺失或重复';
        ids.add(idOf(entry.file));
        if (newName && (!title || !/^[1-9]\d*$/.test(String(match.id)) || !validName(newName) || !validName(folderName))) error = '目标名称或 TMDB 编号无效';
        const item = { ...entry, group, newName, folderName, seasonName, error, path: newName ? [folderName, seasonName, newName].filter(Boolean).join('/') : '' };
        items.push(item);
        if (item.path) {
          const previous = targets.get(item.path);
          if (previous) { previous.error = item.error = '目标路径重复'; }
          targets.set(item.path, item);
        }
      }
    }
    return { items, changed: items.filter(item => !item.error).length, error: items.some(item => item.error === '目标路径重复' || item.error === '文件编号缺失或重复' || item.error === '目标名称或 TMDB 编号无效') ? '存在重复路径或无效目标，请纠正匹配后再整理' : '' };
  }

  function requestApi(path, options) {
    if (!nativeRequire) window.webpackChunk_swangpan_pc?.push([['guangya-' + type + '-' + Date.now()], {}, require => { nativeRequire = require; }]);
    const request = nativeRequire?.(34118)?.E;
    if (typeof request !== 'function') throw Error('当前应用版本的请求接口不兼容');
    return request(path, { ...options, extra: { skipSafeboxUnlock: true } });
  }
  const successful = response => response && (response.code === 0 || (response.code === undefined && response.msg === 'success'));
  async function post(request, path, body, signal) {
    signal?.throwIfAborted();
    const response = await request(path, { method: 'POST', body, ...(signal ? { signal } : {}) });
    if (!successful(response)) throw Error(response?.msg || '请求结果未确认，请刷新后核对');
    return response.data;
  }
  async function listFiles(parentId, request, signal) {
    const files = [], pages = new Set();
    for (let page = 0; ; page++) {
      const data = await post(request, '/userres/v1/file/get_file_list', { parentId, page, pageSize: 100, orderBy: 1, sortType: 1 }, signal);
      if (data && !Array.isArray(data) && !Object.keys(data).length) break;
      if (!Array.isArray(data?.list)) throw Error('目录接口返回的数据格式不兼容');
      if (!data.list.length) break;
      const fingerprint = JSON.stringify(data.list.map(idOf));
      if (pages.has(fingerprint)) throw Error('目录分页未前进，已停止');
      pages.add(fingerprint);
      for (const file of data.list) {
        if (!idOf(file) || !nameOf(file) || ![1, 2].includes(Number(file.resType))) throw Error('文件编号、名称或类型无效');
        files.push({ ...file, parentId: file.parentId ?? parentId });
      }
      if (typeof data.total === 'number' && files.length >= data.total) break;
    }
    return files;
  }

  async function requestTmdb(path, key, { signal, fetcher = window.__guangyaTmdbFetch } = {}) {
    key = String(key).trim().replace(/^Bearer\s+/i, '');
    if (!key) throw Error('请填写 TMDB API Key 或 Read Access Token');
    if (!/^\/(?:configuration|search\/(?:tv|movie)|(?:tv|movie)\/[1-9]\d*)$/.test(path.split('?')[0])) throw Error('TMDB 请求路径无效');
    const url = new URL('https://api.themoviedb.org/3' + path);
    const bearer = /^eyJ/i.test(key);
    if (!bearer) url.searchParams.set('api_key', key);
    if (typeof fetcher !== 'function') throw Error('TMDB 请求通道未加载，请重新运行启动器');
    const logUrl = new URL(url); logUrl.searchParams.delete('api_key');
    const log = (event, data) => console.info(`[云助手][TMDB] ${event}`, JSON.stringify(event === '结果' ? data : { url: logUrl.toString(), ...data }, (name, value) => /^(?:api_key|authorization|access_token|token)$/i.test(name) ? '[已隐藏]' : typeof value === 'string' ? value.split(key).join('[已隐藏]') : value));
    log('请求', { method: 'GET' });
    try {
      const timeout = AbortSignal.timeout(15000);
      let response;
      try {
        response = await fetcher(url.toString(), { headers: bearer ? { Authorization: `Bearer ${key}` } : {}, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      } catch { signal?.throwIfAborted(); throw Error('TMDB 网络请求失败或超时，请检查网络和密钥'); }
      if (!response.ok) throw Error(`TMDB 请求失败（${response.status}），请检查密钥`);
      const data = await response.json();
      const pick = ({ id, name, original_name, seasons, alternative_titles }) => ({ id, name, original_name, seasons, alternative_titles });
      log('结果', Array.isArray(data?.results) ? data.results.map(pick) : pick(data || {}));
      if (!data || data.success === false) throw Error('TMDB 返回错误');
      return data;
    } catch (error) { log('失败', { error: error.message }); throw error; }
  }

  async function search(info, tmdb, { autoMatch = false } = {}) {
    const parameters = new URLSearchParams({ language: 'zh-CN', query: info.title });
    if ((info.filterYear || autoMatch) && info.year) parameters.set(isMovie ? 'year' : 'first_air_date_year', info.year);
    const results = [], ids = new Set();
    let complete = true;
    // ponytail: cap automatic searches at three pages; leave incomplete results for manual selection.
    for (let page = 1; page <= (autoMatch ? 3 : 1); page++) {
      if (page > 1) parameters.set('page', String(page));
      const data = await tmdb(`/search/${type}?` + parameters);
      for (const item of data.results || []) if (!ids.has(String(item.id))) { ids.add(String(item.id)); results.push(item); }
      if (page >= (Number(data.total_pages) || 1)) break;
      if (page === 3) complete = false;
    }
    const query = normalizeMovieText(info.title);
    const candidates = results.filter(item => item.id && (isMovie ? item.title : item.name)).map(item => {
      const title = isMovie ? item.title : item.name, originalTitle = isMovie ? item.original_title : item.original_name;
      const exact = [title, originalTitle].some(title => normalizeMovieText(title) === query);
      const year = String((isMovie ? item.release_date : item.first_air_date) || '').slice(0, 4);
      return { id: item.id, title, originalTitle, year, exact,
        score: (exact ? 1000 : 0) + (info.year && year === info.year ? 120 : 0) + Math.min(12, Math.log(Number(item.vote_count || 0) + 1) * 2) };
    });
    const chineseQuery = /[\u3400-\u9fff]/.test(info.title);
    if (autoMatch && !isMovie && (chineseQuery || /[a-z]/i.test(info.title))) {
      for (const candidate of candidates) {
        if (candidate.exact || (info.year && candidate.year !== info.year)) continue;
        candidate.details = await tmdb(`/tv/${candidate.id}?language=zh-CN&append_to_response=alternative_titles`);
        const resolved = await matchDetails(candidate, tmdb);
        candidate.year = resolved.match.year;
        if (info.year && candidate.year !== info.year) continue;
        if (chineseQuery) candidate.exact = candidate.details.alternative_titles?.results?.some(item => ['CN', 'TW', 'HK'].includes(item.iso_3166_1) && normalizeMovieText(item.title) === query) || false;
        else {
          const details = await tmdb(`/tv/${candidate.id}?language=en-US`);
          const translated = await matchDetails({ ...candidate, details }, tmdb);
          candidate.exact = (!info.year || translated.match.year === info.year) && [translated.match.title, translated.match.originalTitle].some(title => normalizeMovieText(title) === query);
        }
        if (candidate.exact) candidate.score += 1000;
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!autoMatch) return candidates.slice(0, 10);
    candidates.complete = complete;
    // Ambiguous matches remain manual: never organize by popularity alone.
    return candidates;
  }
  async function matchDetails(candidate, tmdb) {
    const { details, ...metadata } = candidate;
    const data = details || await tmdb(`/${type}/${candidate.id}?language=zh-CN&append_to_response=alternative_titles`);
    if (String(data.id) !== String(candidate.id) || (isMovie ? !data.title : !Array.isArray(data.seasons))) throw Error(`TMDB ${mediaName}详情不完整`);
    return { match: { ...metadata, title: (isMovie ? data.title : data.name) || candidate.title, originalTitle: (isMovie ? data.original_title : data.original_name) || candidate.originalTitle,
      year: String((isMovie ? data.release_date : data.first_air_date) || candidate.year || '').slice(0, 4),
      chineseTitle: (isMovie ? data.alternative_titles?.titles : data.alternative_titles?.results)?.find(item => item.iso_3166_1 === 'CN')?.title || '' }, seasons: data.seasons || [] };
  }

  async function matchGroup(group, tmdb) {
    const info = group.info;
    if (info.tmdbError) throw Error(info.tmdbError);
    if (info.tmdbId) { Object.assign(group, await matchDetails({ id: Number(info.tmdbId) }, tmdb)); return; }
    if (isMovie && !info.title) throw Error('无法识别影片名，请手动纠错');
    group.candidates = await search(info, tmdb, { autoMatch: !isMovie });
    const exact = group.candidates.filter(item => item.exact && (!info.year || item.year === info.year));
    if (exact.length === 1 && (isMovie || group.candidates.complete)) Object.assign(group, await matchDetails(exact[0], tmdb));
    else group.error = '请搜索或选择 TMDB 匹配';
  }

  async function scan(folders, { request = requestApi, tmdb, signal, onProgress = () => {}, onUpdate = () => {} } = {}) {
    if (isMovie) return scanMovies(folders, { request, tmdb, signal, onProgress, onUpdate });
    const groups = [], visited = new Set();
    for (const folder of folders) {
      signal?.throwIfAborted();
      if (!idOf(folder) || Number(folder.resType) !== 2) throw Error('请选择有效的剧集文件夹');
      const entries = [];
      async function walk(directory, sourceDirectory) {
        signal?.throwIfAborted();
        const id = idOf(directory);
        if (visited.has(id)) return;
        visited.add(id);
        const children = await listFiles(id, request, signal);
        for (const file of children) {
          if (Number(file.resType) === 2) { await walk(file, `${sourceDirectory}/${nameOf(file)}`); continue; }
          if (visited.has(idOf(file))) continue;
          visited.add(idOf(file));
          const size = Number(file.fileSize ?? file.size ?? file.fileSizeByte ?? file.file_size ?? 0);
          if ((file.fileType === 2 || video.test(nameOf(file))) && size > 10 * 1024 ** 2) {
            entries.push({ file, sourcePath: `${sourceDirectory}/${nameOf(file)}`, info: parseEpisode(nameOf(file), nameOf(folder)) });
            onProgress(`正在扫描 ${nameOf(folder)} · ${entries.length} 集`);
          }
        }
      }
      await walk(folder, nameOf(folder));
      const info = { ...parseEpisode(nameOf(entries[0]?.file || {}), nameOf(folder)) };
      const tmdbIds = new Set(entries.map(entry => entry.info.tmdbId).filter(Boolean));
      if (tmdbIds.size > 1 || entries.some(entry => entry.info.tmdbError)) info.tmdbError = '发现多个不同的 TMDB ID，请手动纠错';
      else if (tmdbIds.size === 1) info.tmdbId = [...tmdbIds][0];
      const group = { folder, info, entries, match: null, seasons: [], candidates: [], error: '', scanned: false };
      groups.push(group); onUpdate(groups);
      if (!entries.length) { group.error = '没有大于 10MB 的视频'; group.scanned = true; onUpdate(groups); continue; }
      onProgress(`正在匹配 ${info.title}`);
      try {
        await matchGroup(group, tmdb);
      } catch (error) { signal?.throwIfAborted(); group.error = error.message; }
      signal?.throwIfAborted(); group.scanned = true; onUpdate(groups);
    }
    return groups;
  }

  async function scanMovies(resources, { request, tmdb, signal, onProgress, onUpdate }) {
    const groups = [], visited = new Set();
    async function walk(resource, path, ancestors = []) {
      signal?.throwIfAborted();
      const id = idOf(resource);
      if (!id || !nameOf(resource) || ![1, 2].includes(Number(resource.resType))) throw Error('请选择有效的电影文件或文件夹');
      if (visited.has(id)) return;
      visited.add(id);
      if (Number(resource.resType) === 2) {
        for (const child of await listFiles(id, request, signal)) await walk(child, [...path, nameOf(resource)], [resource, ...ancestors]);
        return;
      }
      const size = Number(resource.fileSize ?? resource.size ?? resource.fileSizeByte ?? resource.file_size ?? 0);
      if (!(resource.fileType === 2 || video.test(nameOf(resource))) || !(size > 10 * 1024 ** 2)) return;
      const entry = {
        file: resource, sourcePath: [...path, nameOf(resource)].join('/'),
        sourceDirName: ancestors[0] ? nameOf(ancestors[0]) : '',
        sourceAncestors: ancestors.map(ancestor => ({ id: idOf(ancestor), name: nameOf(ancestor) })),
        info: parseMovie(nameOf(resource), path),
      };
      const group = { folder: entry.file, info: entry.info, entries: [entry], match: null, seasons: [], candidates: [], error: '', scanned: false };
      groups.push(group);
      onProgress(`正在扫描电影 · ${groups.length} 部`);
      onUpdate(groups);
      signal?.throwIfAborted();
      onProgress(`正在匹配 ${entry.info.title}`);
      try {
        await matchGroup(group, tmdb);
      } catch (error) { signal?.throwIfAborted(); group.error = error.message; }
      signal?.throwIfAborted(); group.scanned = true; onUpdate(groups);
    }
    for (const resource of resources) await walk(resource, []);
    return groups;
  }

  function findId(value, names) {
    if (!value || typeof value !== 'object') return '';
    for (const name of names) if (value[name] !== undefined && (typeof value[name] === 'string' || Number.isSafeInteger(value[name]))) return String(value[name]);
    for (const child of Object.values(value)) { const id = findId(child, names); if (id) return id; }
    return '';
  }
  async function waitTask(data, request, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
    const taskId = findId(data, ['taskId', 'task_id']);
    if (!taskId) return;
    for (let attempt = 0; attempt < 40; attempt++) {
      const task = await post(request, '/userres/v1/get_task_status', { taskId });
      const status = String(task?.taskStatus ?? task?.task_status ?? task?.status ?? task?.state ?? '').toUpperCase();
      if ([3, 4].includes(Number(status)) || /FAIL|ERROR|CANCEL/.test(status)) throw Error('整理任务失败');
      if (status === '2' || /^(SUCCESS|SUCCEED|DONE|FINISH|COMPLETED)$/.test(status)) return;
      if (attempt < 39) await pause(500);
    }
    throw Error('任务结果未确认，请刷新后核对，勿重复整理');
  }

  async function execute(current, { parentId, request = requestApi, shouldStop = () => false, onProgress = () => {}, pause } = {}) {
    if (typeof parentId !== 'string') throw Error('整理目标目录无效');
    if (current.error) throw Error(current.error);
    const result = { success: 0, failed: 0, skipped: 0, pending: 0 };
    const directories = new Map(), destinations = new Map(), batches = new Map();
    async function ensureDirectory(parent, name) {
      const cacheKey = JSON.stringify([parent, name]);
      if (directories.has(cacheKey)) return directories.get(cacheKey);
      const find = files => files.find(file => Number(file.resType) === 2 && nameOf(file) === name);
      let entry = find(await listFiles(parent, request));
      if (!entry) {
        try {
          const data = await post(request, '/userres/v1/file/create_dir', { parentId: parent, dirName: name, failIfNameExist: true });
          await waitTask(data, request, pause);
          entry = find(await listFiles(parent, request));
        } catch (error) {
          entry = find(await listFiles(parent, request));
          if (!entry) throw error;
        }
      }
      if (!entry) throw Error(`创建目录结果未确认：${name}`);
      directories.set(cacheKey, idOf(entry));
      return idOf(entry);
    }
    async function moveTvBatch(first, targetId) {
      const key = JSON.stringify([first.folderName, first.seasonName]);
      if (batches.has(key)) return batches.get(key);
      const items = current.items.filter(item => !item.error && item.folderName === first.folderName && item.seasonName === first.seasonName);
      const batch = { errors: new Map() };
      batches.set(key, batch);
      try {
        const targetFiles = await listFiles(targetId, request), sources = new Map(), moving = [];
        for (const item of items) {
          if (shouldStop()) { batch.stopped = true; return batch; }
          try {
            if (targetFiles.some(file => idOf(file) !== idOf(item.file) && [item.newName, nameOf(item.file)].includes(nameOf(file)))) throw Error('目标目录已有同名文件，已跳过以避免覆盖');
            const existing = targetFiles.find(file => idOf(file) === idOf(item.file));
            if (existing) {
              if (![nameOf(item.file), item.newName].includes(nameOf(existing))) throw Error('文件名称已变化，请重新扫描');
              continue;
            }
            const parent = String(item.file.parentId);
            if (!sources.has(parent)) sources.set(parent, await listFiles(parent, request));
            const source = sources.get(parent).find(file => idOf(file) === idOf(item.file));
            if (!source || nameOf(source) !== nameOf(item.file)) throw Error('源文件已变化，请重新扫描');
            moving.push(item);
          } catch (error) { batch.errors.set(item, error.message); }
        }
        // Files keep their original names during the batch move; reject duplicate originals too.
        const originals = new Map();
        for (const item of moving) {
          const name = nameOf(item.file), previous = originals.get(name);
          if (previous) { batch.errors.set(previous, '同批原文件名重复，无法安全移动'); batch.errors.set(item, '同批原文件名重复，无法安全移动'); }
          originals.set(name, item);
        }
        const ready = moving.filter(item => !batch.errors.has(item));
        if (shouldStop()) { batch.stopped = true; return batch; }
        if (ready.length) {
          const data = await post(request, '/userres/v1/file/move_file', { fileIds: ready.map(item => idOf(item.file)), parentId: targetId });
          await waitTask(data, request, pause);
          const moved = await listFiles(targetId, request);
          for (const item of ready) if (!moved.some(file => idOf(file) === idOf(item.file))) batch.errors.set(item, '移动结果未确认，请刷新后核对');
        }
      } catch (error) {
        // A failed/unknown batch must not be resubmitted one file at a time.
        for (const item of items) if (!batch.errors.has(item)) batch.errors.set(item, error.message);
      }
      return batch;
    }
    for (let index = 0; index < current.items.length; index++) {
      if (shouldStop()) { result.pending = current.items.length - index; break; }
      const item = current.items[index];
      const update = (status, reason = '') => onProgress({ index, item, status, reason, ...result });
      if (item.error) { result.skipped++; update('skipped', item.error); continue; }
      update('processing');
      try {
        const showId = await ensureDirectory(parentId, item.folderName);
        const targetId = isMovie ? showId : await ensureDirectory(showId, item.seasonName);
        if (isMovie) {
          const targetFiles = await listFiles(targetId, request);
          if (targetFiles.some(file => idOf(file) !== idOf(item.file) && [item.newName, nameOf(item.file)].includes(nameOf(file)))) throw Error('目标目录已有同名文件，已跳过以避免覆盖');
          if (!targetFiles.some(file => idOf(file) === idOf(item.file))) {
            const source = (await listFiles(String(item.file.parentId), request)).find(file => idOf(file) === idOf(item.file));
            if (!source || nameOf(source) !== nameOf(item.file)) throw Error('源文件已变化，请重新扫描');
            const data = await post(request, '/userres/v1/file/move_file', { fileIds: [idOf(item.file)], parentId: targetId });
            await waitTask(data, request, pause);
            if (!(await listFiles(targetId, request)).some(file => idOf(file) === idOf(item.file))) throw Error('移动结果未确认，请刷新后核对');
          }
        } else {
          const batch = await moveTvBatch(item, targetId);
          if (batch.stopped) { result.pending = current.items.length - index; break; }
          if (batch.errors.has(item)) throw Error(batch.errors.get(item));
        }
        const targetFiles = await listFiles(targetId, request);
        if (!isMovie && targetFiles.some(file => idOf(file) !== idOf(item.file) && [item.newName, nameOf(item.file)].includes(nameOf(file)))) throw Error('目标目录已有同名文件，已跳过以避免覆盖');
        const moved = targetFiles.find(file => idOf(file) === idOf(item.file));
        if (!moved) throw Error('目标文件缺失，请刷新后核对');
        if (![nameOf(item.file), item.newName].includes(nameOf(moved))) throw Error('文件名称已变化，请重新扫描');
        if (nameOf(moved) !== item.newName) {
          const data = await post(request, '/userres/v1/file/rename', { fileId: idOf(item.file), newName: item.newName });
          await waitTask(data, request, pause);
        }
        destinations.set(item, targetId);
        result.success++; update('success');
      } catch (error) { result.failed++; update('failed', error.message); }
    }
    if (current.items.length && result.success === current.items.length && !shouldStop()) {
      const cleanup = result.cleanup = { deleted: 0, retained: [], failed: [] };
      const protectedIds = new Set([parentId, ...directories.values()]);
      const processedDirs = new Set();
      const visited = new Set();
      async function safeToDelete(id) {
        if (protectedIds.has(id)) return false;
        if (visited.has(id)) throw Error('原目录结构异常，已保留');
        visited.add(id);
        for (const file of await listFiles(id, request)) {
          if (Number(file.resType) === 2) { if (!await safeToDelete(idOf(file))) return false; }
          else if (file.fileType === 2 || video.test(nameOf(file))) {
            const size = Number(file.fileSize ?? file.size ?? file.fileSizeByte ?? file.file_size ?? NaN);
            if (!Number.isFinite(size) || size > 10 * 1024 ** 2) return false;
          }
        }
        return true;
      }
      const removeDir = async (id, parent) => {
        const data = await post(request, '/userres/v1/file/delete_file', { fileIds: [id] });
        await waitTask(data, request, pause);
        if ((await listFiles(parent, request)).some(file => idOf(file) === id)) throw Error('原目录删除结果未确认，请刷新后核对');
        cleanup.deleted++;
        processedDirs.add(id);
      };
      for (const group of new Set(current.items.map(item => item.group))) {
        const folder = group.folder, first = group.entries[0] || {};
        const sourceName = isMovie ? String(first.sourceDirName || nameOf(folder)) : nameOf(folder);
        const retain = (reason, name = sourceName) => cleanup.retained.push({ folder: name, reason });
        if (shouldStop()) { retain('已停止，保留原目录'); continue; }
        try {
          const targets = new Map();
          for (const item of current.items.filter(item => item.group === group)) {
            const targetId = destinations.get(item);
            if (!targets.has(targetId)) targets.set(targetId, await listFiles(targetId, request));
            if (!targets.get(targetId).some(file => idOf(file) === idOf(item.file) && nameOf(file) === item.newName)) throw Error('目标文件或名称未确认，原目录已保留');
          }
          if (isMovie) {
            const ancestors = first.sourceAncestors || [];
            const chain = ancestors.length
              ? ancestors.map((ancestor, index) => ({ id: String(ancestor.id || ''), name: String(ancestor.name || ''), parent: index + 1 < ancestors.length ? String(ancestors[index + 1].id || '') : parentId }))
              : [{ id: String(folder.parentId ?? ''), name: '', parent: parentId }];
            for (const dir of chain) {
              if (!dir.id || processedDirs.has(dir.id)) continue;
              if (shouldStop()) { retain('已停止，保留原目录', dir.name || sourceName); break; }
              if (protectedIds.has(dir.id)) { retain('原目录是整理目标或当前目录，保留并停止向上清理', dir.name || sourceName); break; }
              const source = (await listFiles(dir.parent, request)).find(file => idOf(file) === dir.id);
              if (!source) { retain('原目录已不存在', dir.name || sourceName); break; }
              if (Number(source.resType) !== 2) throw Error('原目录编号或类型无效');
              if (dir.name && nameOf(source) !== dir.name) throw Error('原目录名称已变化，已保留');
              visited.clear();
              if (!await safeToDelete(dir.id)) { retain('目录包含整理目标或未整理视频，已保留', dir.name || sourceName); break; }
              if (shouldStop()) { retain('已停止，保留原目录', dir.name || sourceName); break; }
              await removeDir(dir.id, dir.parent);
            }
            continue;
          }
          const sourceId = idOf(folder);
          if (!sourceId || Number(folder.resType) !== 2) throw Error('原目录编号或类型无效');
          const sourceParent = String(folder.parentId ?? parentId);
          const source = (await listFiles(sourceParent, request)).find(file => idOf(file) === sourceId);
          if (!source) { retain('原目录已不存在'); continue; }
          if (nameOf(source) !== nameOf(folder)) throw Error('原目录名称已变化，已保留');
          const reusedRoot = sourceId === directories.get(JSON.stringify([parentId, group.folderName]));
          if (protectedIds.has(sourceId) && !reusedRoot) { retain('原目录同时是整理目标，已保留'); continue; }
          const candidates = reusedRoot ? (await listFiles(sourceId, request)).filter(file => Number(file.resType) === 2) : [source];
          if (reusedRoot) retain('原目录同时是目标剧集目录，保留根目录并清理旧子目录');
          const queue = candidates.map(file => ({ file, parent: reusedRoot ? sourceId : sourceParent, label: reusedRoot ? `${sourceName}/${nameOf(file)}` : sourceName }));
          const queued = new Set(queue.map(entry => idOf(entry.file)));
          while (queue.length) {
            const { file: candidate, parent: candidateParent, label } = queue.shift();
            const candidateId = idOf(candidate);
            if (shouldStop()) { retain('已停止，保留原目录', label); break; }
            try {
              if (protectedIds.has(candidateId)) {
                retain('整理目标目录，保留目录并继续清理内部旧目录', label);
                for (const child of await listFiles(candidateId, request)) {
                  const childId = idOf(child);
                  if (Number(child.resType) === 2 && !queued.has(childId)) { queued.add(childId); queue.push({ file: child, parent: candidateId, label: `${label}/${nameOf(child)}` }); }
                }
                continue;
              }
              visited.clear();
              if (!await safeToDelete(candidateId)) { retain('目录包含整理目标或未整理视频，已保留', label); continue; }
              if (shouldStop()) { retain('已停止，保留原目录', label); break; }
              await removeDir(candidateId, candidateParent);
            } catch (error) { cleanup.failed.push({ folder: label, reason: error.message }); }
          }
        } catch (error) { cleanup.failed.push({ folder: sourceName, reason: error.message }); }
      }
    }
    return result;
  }

  function getDestination() {
    const route = window.location.hash.split('?')[0];
    if (/^#\/home(?:\/all)?\/?$/.test(route)) return '';
    if (!route.startsWith('#/home/all/')) throw Error('请进入全部文件或目标文件夹后再整理');
    const parts = route.slice('#/home/all/'.length).split('/').filter(Boolean);
    if (!parts.length || parts.some(part => !/^\d+-/.test(part))) throw Error('无法确定当前目录');
    return parts.at(-1).split('-')[0];
  }

  function savedKey() {
    try { return String(window.localStorage.getItem(storageKey) || '').trim().replace(/^Bearer\s*/i, '').trim(); }
    catch { return ''; }
  }

  function configureKey(options) {
    if (configurationView) { configurationView.element.focus(); return configurationView; }
    let input, controller, submitting = false;
    const modal = window.__guangyaModal.open({
      id: configId, title: 'TMDB 密钥配置', width: 480, closeOnMask: false,
      onClose() { controller?.abort(); input?.destroy(); if (configurationView === modal) configurationView = null; },
    });
    configurationView = modal;
    modal.body.innerHTML = `<style>
      #${configId} .swangpan-modal__body { display:flex; flex-direction:column; gap:12px; font-size:13px; line-height:20px; }
      #${configId} .swangpan-modal__body > p { margin:0; font-size:inherit; line-height:inherit; }
      #${configId} [role="status"]:empty { display:none; }
      #${configId} [role="status"][data-error="true"] { color:var(--ant-color-error,#ff4d4f); }
    </style><p data-tmdb-description>请配置 TMDB API Key，验证成功后继续整理${mediaName}。密钥仅保存在本机。</p><div data-tmdb-key></div><p role="status" aria-live="polite"></p>`;
    const status = modal.body.querySelector('[role="status"]');
    modal.addButton('取消', { onClick: () => modal.close() });
    const save = modal.addButton('验证并保存', { primary: true, onClick: async () => {
      if (submitting) return;
      const key = input.value.trim().replace(/^Bearer\s*/i, '').trim();
      if (!key) { status.dataset.error = 'true'; status.textContent = '请输入 TMDB 密钥'; input.element.focus(); return; }
      submitting = true; save.disabled = true; input.disabled = true;
      controller = new AbortController();
      const signal = controller.signal;
      delete status.dataset.error;
      status.textContent = '正在验证密钥';
      try {
        const data = options.tmdb ? await options.tmdb('/configuration') : await requestTmdb('/configuration', key, { signal });
        signal.throwIfAborted();
        if (!data?.images) throw Error('TMDB 密钥验证失败');
        try { window.localStorage.setItem(storageKey, key); } catch { throw Error('密钥有效，但本机存储不可用'); }
        modal.close('saved');
        if (!destroyed) run(options);
      } catch (error) {
        if (modal.element.isConnected) { status.dataset.error = 'true'; status.textContent = error.message || 'TMDB 密钥验证失败'; }
      } finally {
        submitting = false;
        if (modal.element.isConnected) { save.disabled = false; input.disabled = false; }
      }
    } });
    try {
      input = window.__guangyaNativeUI.mountInput(modal.body.querySelector('[data-tmdb-key]'), {
        type: 'password', size: 'large', ariaLabel: 'TMDB 密钥', placeholder: 'API Key 或 Read Access Token',
      });
      input.element.focus();
    } catch (error) { modal.close('destroy'); throw error; }
    return modal;
  }

  function run({ resources, request = requestApi, tmdb: customTmdb, parentId } = {}) {
    if (destroyed) return;
    if (view) { view.element.focus(); return view; }
    if (configurationView) { configurationView.element.focus(); return configurationView; }
    const folders = (resources ?? window.__guangyaExport.getSelection()).filter(file => isMovie ? [1, 2].includes(Number(file.resType)) : Number(file.resType) === 2);
    if (!folders.length) { window.__guangyaMessage.warning(isMovie ? '请先选择电影文件或文件夹' : '请先选择剧集文件夹'); return; }
    parentId ??= getDestination();
    if (!savedKey()) return configureKey({ resources: folders, request, tmdb: customTmdb, parentId });
    let groups = [], current, scanned = false, finished = false, attempted = false, controller;
    let card, ruleInput, unmatchedFilter, detailsView, correctionView, groupInputs = [], groupTags = [], detailLinks = [];
    let onlyUnmatched = false;
    const groupRows = new Map(), groupProgress = new Map();
    stopping = false;
    const modal = window.__guangyaModal.open({ id: dialogId, title: `整理${mediaName}`, icon: 'tv', width: 700, closeOnMask: false,
      onClose(reason) {
        stopping = true; controller?.abort(); detailsView?.close('destroy'); correctionView?.close('destroy');
        for (const input of [ruleInput, unmatchedFilter, ...groupInputs, ...groupTags, ...detailLinks]) input?.destroy();
        card?.destroy();
        if (view === modal) view = null;
        if (attempted && !busy && !destroyed && reason !== 'destroy') document.querySelector('main button[aria-label="刷新"]')?.click();
      },
    });
    view = modal;
    modal.body.innerHTML = `<style>
      #guangya-${type}-dialog .swangpan-modal__container { min-width:min(700px,calc(100vw - 32px)); }
      #guangya-${type}-dialog [data-tv-settings] { margin-bottom:12px; }
      #guangya-${type}-dialog [data-tv-rule-example] { margin:8px 0 0; color:var(--swangpan-color-font-font4,#888); font-size:12px; overflow-wrap:anywhere; }
      #guangya-${type}-dialog [data-tv-summary] { flex:1; min-width:0; font-size:13px; margin:0; text-align:left; overflow-wrap:anywhere; color:var(--swangpan-color-font-font4,#888); }
      #guangya-${type}-dialog .swangpan-modal__footer { display:flex; align-items:center; gap:12px; }
      #guangya-${type}-dialog .swangpan-modal__footer > button { flex-shrink:0; }
      #guangya-${type}-dialog [data-tv-preview] .ant-card-body { padding:0; max-height:380px; overflow:auto; overscroll-behavior:contain; }
      #guangya-${type}-dialog [data-tv-preview-heading] { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:0 0 12px; font-size:13px; }
      #guangya-${type}-dialog [data-tv-preview-heading] span { color:var(--swangpan-color-font-font4,#888); }
      #guangya-${type}-dialog [data-tv-filter] { display:flex; align-items:center; gap:6px; white-space:nowrap; }
      #guangya-${type}-dialog [data-tv-empty] { padding:16px; text-align:center; color:var(--swangpan-color-font-font4,#888); }
      #guangya-${type}-dialog [data-tv-columns] { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 150px; align-items:center; gap:16px; padding:12px 8px; font-size:13px; overflow-wrap:anywhere; }
      #guangya-${type}-dialog [data-tv-columns] > [role="cell"]:not([data-tv-actions]) { min-width:0; font-size:13px; }
      #guangya-${type}-dialog [data-tv-table-head] { color:var(--swangpan-color-font-font4,#888); background:var(--ant-color-fill-alter,#fafafa); border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0); }
      #guangya-${type}-dialog [data-tv-table-head] span:last-child { text-align:right; }
      #guangya-${type}-dialog [data-tv-group] + [data-tv-group] { border-top:1px solid var(--ant-color-border-secondary,#f0f0f0); }
      #guangya-${type}-dialog [data-tv-target] { color:var(--swangpan-color-brand-brand-def,var(--ant-color-primary,#ff6800)); font-weight:600; }
      #guangya-${type}-dialog [data-tv-target] .ant-btn { padding:0; height:auto; font:inherit; max-width:100%; justify-content:flex-start; white-space:nowrap; text-align:left; }
      #guangya-${type}-dialog [data-tv-path-text] { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #guangya-${type}-dialog [data-tv-target][data-tv-pending="true"] { color:var(--swangpan-color-font-font4,#888); font-weight:400; }
      #guangya-${type}-dialog [data-tv-actions] { display:flex; justify-content:flex-end; align-items:center; gap:8px; }
      #guangya-${type}-dialog [data-tv-correct] { display:inline-flex; }
      #guangya-${type}-dialog [data-tv-correct] .ant-tag:focus-visible { outline:2px solid var(--ant-color-primary,#ff6800); outline-offset:2px; }
      #guangya-${type}-dialog [data-tv-state] { display:inline-flex; }
    </style><div data-tv-settings><div data-tv-rule></div><p data-tv-rule-example aria-live="polite"></p></div>
    <p data-tv-summary role="status" aria-live="polite"></p><div data-tv-preview-heading><strong>名称预览</strong><label data-tv-filter><span data-tv-filter-switch></span>过滤</label></div><div data-tv-preview></div>`;
    const root = modal.element;
    const summary = root.querySelector('[data-tv-summary]');
    modal.footer.prepend(summary);
    const closeButton = modal.addButton('取消', { onClick() {
      if (busy) { stopping = true; controller?.abort(); closeButton.disabled = true; closeButton.textContent = '正在停止'; }
      else modal.close();
    } });
    const start = modal.addButton('扫描并匹配', { primary: true, onClick: async () => {
      if (busy || finished || correctionView) return;
      if (scanned) { render(); if (current.error || !current.changed) return; }
      try { namingFields(ruleInput.value); } catch (error) { summary.textContent = error.message; return; }
      setBusy(true); stopping = false;
      try {
        if (!scanned) {
          controller = new AbortController();
          const signal = controller.signal;
          groups = await scan(folders, { request, tmdb: getTmdb(), signal,
            onProgress(text) { summary.textContent = text; },
            onUpdate(nextGroups) {
              if (signal.aborted || destroyed || !modal.element.isConnected) return;
              groups = [...nextGroups];
              const text = summary.textContent, scroller = card.element.querySelector('.ant-card-body'), top = scroller.scrollTop;
              render(); summary.textContent = text; scroller.scrollTop = top;
              const row = card.body.querySelectorAll('[data-tv-group]')[groups.length - 1];
              if (row && !row.hidden) {
                const bounds = scroller.getBoundingClientRect(), position = row.getBoundingClientRect();
                const scale = bounds.height / scroller.offsetHeight || 1;
                if (position.bottom > bounds.bottom) scroller.scrollTop += (position.bottom - bounds.bottom) / scale;
                else if (position.top < bounds.top) scroller.scrollTop += (position.top - bounds.top) / scale;
              }
            },
          });
          controller = null; scanned = true; render();
        } else {
          finished = true;
          const result = await execute(current, { parentId, request, shouldStop: () => stopping || destroyed,
            onProgress(progress) {
              if (progress.status === 'processing') attempted = true;
              const group = progress.item.group;
              const count = groupProgress.get(group) || { completed: 0, success: 0, failed: 0 };
              if (progress.status !== 'processing') { count.completed++; if (progress.status === 'success') count.success++; if (progress.status === 'failed') count.failed++; }
              groupProgress.set(group, count);
              setGroupStatus(group, '整理中');
              if (progress.status === 'failed') { summary.title = progress.reason; groupRows.get(group).element.title = progress.reason; }
              summary.textContent = `成功 ${progress.success} · 失败 ${progress.failed} · 跳过 ${progress.skipped}`;
            },
          });
          const cleanup = result.cleanup;
          summary.textContent = `成功 ${result.success} · 失败 ${result.failed} · 跳过 ${result.skipped} · 未处理 ${result.pending}` + (cleanup ? ` · 原目录删除 ${cleanup.deleted} · 保留 ${cleanup.retained.length} · 清理失败 ${cleanup.failed.length}` : '');
          if (cleanup) summary.title = [...cleanup.retained, ...cleanup.failed].map(item => `${item.folder}：${item.reason}`).join('\n');
          for (const group of groups) {
            const count = groupProgress.get(group) || { completed: 0, success: 0, failed: 0 };
            const total = current.items.filter(item => item.group === group).length;
            setGroupStatus(group, count.failed ? (count.success ? '部分失败' : '失败') : count.completed < total ? (count.completed ? '已停止' : '未处理') : count.success ? '已整理' : '已跳过', count.failed ? 'failed' : count.completed === total && count.success ? 'success' : '');
          }
          window.__guangyaMessage[result.failed || cleanup?.failed.length ? 'warning' : 'success'](stopping ? `${mediaName}整理已停止` : cleanup?.failed.length ? '剧集文件整理完成，但原目录清理失败' : `${mediaName}整理完成`);
        }
      } catch (error) { summary.textContent = stopping ? '扫描已停止' : error.message; }
      finally { controller = null; setBusy(false); }
    } });
    root.addEventListener('cancel', event => { if (busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true });
    function setBusy(value) {
      busy = value;
      modal.body.toggleAttribute('aria-busy', value);
      root.querySelector('[data-slot="close"]').disabled = value;
      for (const input of [ruleInput, ...groupInputs]) if (input) input.disabled = value || finished;
      for (const link of detailLinks) link.disabled = value;
      for (const control of modal.body.querySelectorAll('button,select')) if (!control.closest('[data-tv-filter]')) control.disabled = value || (finished && !control.closest('[data-tv-target]'));
      closeButton.disabled = false; closeButton.textContent = value ? '停止' : finished ? '关闭' : '取消';
      start.disabled = value || finished || (scanned && (!!current?.error || !current?.changed));
      start.textContent = value ? '处理中' : finished ? '已结束' : scanned ? '确认整理' : '扫描并匹配';
    }
    function getTmdb() {
      if (customTmdb) return customTmdb;
      const key = savedKey();
      return path => requestTmdb(path, key, { signal: controller?.signal });
    }
    function showCorrection(group) {
      if (busy || finished || destroyed) return;
      if (correctionView) { correctionView.element.focus(); return; }
      let nameInput, yearInput, action, contentCard, localController, pending = false, candidates = [], selected;
      const resultViews = [];
      const popup = window.__guangyaModal.open({
        id: `guangya-${type}-correction-dialog`, title: '纠错识别', icon: 'correction', width: 560, closeOnMask: false,
        onClose() {
          localController?.abort(); nameInput?.destroy(); yearInput?.destroy(); action?.destroy();
          for (const view of resultViews) view.destroy(); contentCard?.destroy();
          if (correctionView === popup) correctionView = null;
        },
      });
      correctionView = popup;
      popup.body.innerHTML = `<style>
        #guangya-${type}-correction-dialog [data-correction-status] { font-size:13px; color:var(--swangpan-color-font-font4,#888); }
        #guangya-${type}-correction-dialog [data-correction-status]:empty { display:none; }
        #guangya-${type}-correction-dialog [data-correction-status][data-error] { color:var(--ant-color-error,#ff4d4f); }
        #guangya-${type}-correction-dialog [data-correction-fields] { display:flex; gap:12px; margin-bottom:12px; }
        #guangya-${type}-correction-dialog label { display:flex; flex-direction:column; gap:6px; flex:1; min-width:0; font-size:13px; }
        #guangya-${type}-correction-dialog [data-correction-results] { display:grid; gap:8px; max-height:240px; overflow:auto; overscroll-behavior:contain; }
        #guangya-${type}-correction-dialog [data-correction-option] { cursor:pointer; }
        #guangya-${type}-correction-dialog [data-correction-option][aria-checked="true"] { border-color:var(--ant-color-primary,#ff6800); background:var(--ant-color-primary-bg,#fff7e6); }
        #guangya-${type}-correction-dialog [data-correction-option]:focus-visible { outline:2px solid var(--ant-color-primary,#ff6800); outline-offset:-2px; }
        #guangya-${type}-correction-dialog [data-correction-option] .ant-card-body-content { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        #guangya-${type}-correction-dialog [data-correction-name] { min-width:0; overflow-wrap:anywhere; }
        #guangya-${type}-correction-dialog [data-correction-meta] { display:flex; gap:6px; flex-shrink:0; }
        #guangya-${type}-correction-dialog .swangpan-modal__footer { align-items:center; }
        #guangya-${type}-correction-dialog [data-correction-note] { flex:1; margin:0; font-size:13px; text-align:left; color:var(--swangpan-color-font-font4,#888); }
      </style><div data-correction-fields><label>${mediaName}名称<span data-correction-name-input></span></label><label>上映时间<span data-correction-year-input></span></label></div><div data-correction-results role="radiogroup" aria-label="候选${mediaName}"></div><p data-correction-status role="status" aria-live="polite"></p>`;
      const results = popup.body.querySelector('[data-correction-results]'), status = popup.body.querySelector('[data-correction-status]');
      const contentHost = document.createElement('div'); popup.body.append(contentHost);
      try { contentCard = window.__guangyaNativeUI.mountCard(contentHost); } catch (error) { popup.close('destroy'); throw error; }
      contentCard.body.append(popup.body.querySelector('[data-correction-fields]'), results, status);
      const clearResults = () => { for (const view of resultViews.splice(0)) view.destroy(); results.replaceChildren(); };
      const reset = () => { clearResults(); candidates = []; selected = undefined; status.textContent = ''; delete status.dataset.error; if (action) action.text = `查找${mediaName}`; };
      const choose = index => {
        if (pending) return;
        selected = candidates[index];
        for (const [i, option] of [...results.querySelectorAll('[data-correction-option]')].entries()) { option.setAttribute('aria-checked', String(i === index)); option.tabIndex = i === index ? 0 : -1; }
      };
      const displayCandidates = () => {
        clearResults();
        for (const [index, candidate] of candidates.entries()) {
          const host = document.createElement('div'); results.append(host);
          const card = window.__guangyaNativeUI.mountCard(host);
          const option = card.element; option.dataset.correctionOption = String(candidate.id); option.setAttribute('role', 'radio');
          const name = document.createElement('span'); name.dataset.correctionName = '';
          const title = document.createElement('strong'); title.textContent = candidate.title;
          name.append(title);
          const meta = document.createElement('span'); meta.dataset.correctionMeta = '';
          const id = document.createElement('span'), year = document.createElement('span'); meta.append(id, year); card.body.append(name, meta);
          resultViews.push(window.__guangyaNativeUI.mountTag(id, { text: `TMDB ${candidate.id}`, color: 'success', showIcon: false }), window.__guangyaNativeUI.mountTag(year, { text: candidate.year || '未知年份', color: 'processing', showIcon: false }), card);
          option.onclick = () => choose(index);
          option.onkeydown = event => {
            if (pending) return;
            let next = index;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % candidates.length;
            else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + candidates.length - 1) % candidates.length;
            else if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault(); choose(next); results.querySelectorAll('[data-correction-option]')[next].focus();
          };
        }
        if (candidates.length) choose(0);
      };
      const note = document.createElement('p'); note.dataset.correctionNote = ''; note.textContent = '只更新匹配预览，不会修改文件'; popup.footer.append(note);
      popup.addButton('取消', { onClick: () => popup.close() });
      const actionHost = document.createElement('span'); popup.footer.append(actionHost);
      try {
        nameInput = window.__guangyaNativeUI.mountInput(popup.body.querySelector('[data-correction-name-input]'), { value: group.info.title, size: 'large', ariaLabel: `${mediaName}名称`, onChange: reset });
        yearInput = window.__guangyaNativeUI.mountInput(popup.body.querySelector('[data-correction-year-input]'), { value: group.info.year || '', size: 'large', ariaLabel: '上映时间', onChange: reset });
        action = window.__guangyaNativeUI.mountButton(actionHost, { text: `查找${mediaName}`, type: 'primary', size: 'large', onClick: async () => {
          if (pending) return;
          const title = nameInput.value.trim(), year = yearInput.value.trim();
          if (!title || (year && !/^\d{4}$/.test(year))) { status.dataset.error = ''; status.textContent = !title ? `请输入${mediaName}名称` : '上映时间需为四位年份或留空'; return; }
          pending = true; action.disabled = true; nameInput.disabled = true; yearInput.disabled = true; popup.body.setAttribute('aria-busy', 'true');
          delete status.dataset.error; localController = new AbortController(); const signal = localController.signal;
          const tmdb = path => customTmdb ? customTmdb(path) : requestTmdb(path, savedKey(), { signal });
          try {
            if (selected) {
              const resolved = await matchDetails(selected, tmdb); signal.throwIfAborted();
              Object.assign(group, resolved, { info: { ...group.info, title, year }, candidates, error: '' });
              popup.close('matched'); render();
            } else {
              const found = await search({ title, year, filterYear: true }, tmdb); signal.throwIfAborted(); candidates = found;
              pending = false; displayCandidates();
              status.textContent = candidates.length ? '' : `没有找到候选${mediaName}，请修改名称或年份`;
              action.text = candidates.length ? '确认匹配' : `查找${mediaName}`;
            }
          } catch (error) { if (popup.element.isConnected) { status.dataset.error = ''; status.textContent = error.message || '纠错识别失败'; } }
          finally {
            pending = false;
            if (popup.element.isConnected) { action.disabled = false; nameInput.disabled = false; yearInput.disabled = false; popup.body.removeAttribute('aria-busy'); }
          }
        } });
        nameInput.element.focus();
      } catch (error) { popup.close('destroy'); throw error; }
    }
    function showDetails(group) {
      if (busy || destroyed || correctionView) return;
      if (detailsView) { detailsView.element.focus(); return; }
      let collapse;
      const tooltips = [];
      const detail = window.__guangyaModal.open({
        id: `guangya-${type}-details-dialog`, title: `${mediaName}整理详情`, icon: 'details', width: 700, closeOnMask: false, restoreFocus: false,
        onClose() { for (const tooltip of tooltips) tooltip.destroy(); collapse?.destroy(); if (detailsView === detail) detailsView = null; },
      });
      detailsView = detail;
      try {
        detail.body.innerHTML = `<style>
          #guangya-${type}-details-dialog .swangpan-modal__container { min-width:min(700px,calc(100vw - 32px)); }
          #guangya-${type}-details-dialog .swangpan-modal__body { overflow:hidden; }
          #guangya-${type}-details-dialog [data-details-list] { max-height:min(60vh,calc(100vh - 230px)); overflow:auto; overscroll-behavior:contain; }
          #guangya-${type}-details-dialog [data-details-subtitle] { color:var(--swangpan-color-font-font4,#888); font-size:inherit; font-weight:400; overflow-wrap:anywhere; }
          #guangya-${type}-details-dialog [data-details-heading] { display:flex; align-items:center; gap:12px; font-size:13px; }
          #guangya-${type}-details-dialog [data-details-count] { color:var(--swangpan-color-font-font4,#888); white-space:nowrap; }
          #guangya-${type}-details-dialog .ant-collapse-body { padding:0; }
          #guangya-${type}-details-dialog [data-details-season] { display:flex; flex-direction:column; max-height:min(320px,40vh); overflow:hidden; }
          #guangya-${type}-details-dialog [data-details-rows] { min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
          #guangya-${type}-details-dialog [data-details-row] { padding:12px; font-size:12px; overflow-wrap:anywhere; }
          #guangya-${type}-details-dialog [data-details-row] + [data-details-row] { border-top:1px solid var(--ant-color-border-secondary,#f0f0f0); }
          #guangya-${type}-details-dialog [data-details-target] { display:block; width:fit-content; max-width:100%; }
          #guangya-${type}-details-dialog [data-details-error] { color:var(--ant-color-error,#ff4d4f); }
          #guangya-${type}-details-dialog .swangpan-modal__footer { align-items:center; }
          #guangya-${type}-details-dialog [data-details-note] { flex:1; margin:0; text-align:left; color:var(--swangpan-color-font-font4,#888); font-size:13px; }
        </style>`;
        const lists = document.createElement('div'); lists.dataset.detailsList = ''; detail.body.append(lists);
        const buckets = new Map();
        for (const item of current.items.filter(item => item.group === group)) {
          const season = isMovie ? 1 : item.info.label ? Number(item.info.season) : Infinity;
          if (!buckets.has(season)) buckets.set(season, []);
          buckets.get(season).push(item);
        }
        const panels = [];
        const sorted = [...buckets].sort((a, b) => a[0] - b[0]);
        const initial = sorted.find(([season, items]) => season > 0 && Number.isFinite(season) && items.some(item => !item.error)) || sorted.find(([, items]) => items.some(item => !item.error)) || sorted[0];
        for (const [season, items] of sorted) {
          const section = document.createElement('section'); section.dataset.detailsSeason = String(season);
          const heading = document.createElement('div'); heading.dataset.detailsHeading = '';
          const name = document.createElement('strong'); name.textContent = isMovie ? '电影文件' : season === Infinity ? '未识别季集' : season === 0 ? '特别篇' : `第 ${season} 季`;
          const count = document.createElement('span'); count.dataset.detailsCount = '';
          const ready = isMovie ? items.filter(item => !item.error).length : new Set(items.filter(item => !item.error).map(item => item.info.episode)).size;
          const total = group.seasons.find(item => Number(item.season_number) === season)?.episode_count;
          count.textContent = isMovie ? `${ready} 部可整理` : `${ready}/${total > 0 ? total : '?'} 集可整理`;
          const suffix = document.createElement('span'); suffix.dataset.detailsSubtitle = '';
          const directory = [group.folderName || nameOf(group.folder), ...(!isMovie && Number.isFinite(season) ? [`Season ${season}`] : [])].join('/');
          suffix.textContent = directory; heading.append(name, suffix);
          panels.push({ key: `Season ${season}`, label: heading, extra: count, children: section });
          section.setAttribute('aria-label', name.textContent + '整理详情');
          const rows = document.createElement('div'); rows.dataset.detailsRows = ''; rows.setAttribute('role', 'list');
          const addRow = item => {
            const row = document.createElement('div'); row.dataset.detailsRow = ''; row.setAttribute('role', 'listitem');
            const target = document.createElement('span'); target.dataset.detailsTarget = '';
            if (item.error) target.dataset.detailsError = '';
            tooltips.push(window.__guangyaNativeUI.mountTooltip(target, { text: item.error ? `已跳过：${item.error}` : item.newName, title: item.sourcePath || `${nameOf(group.folder)}/${nameOf(item.file)}` }));
            row.append(target); rows.append(row);
          };
          section.append(rows);
          for (const item of [...items].sort((a, b) => Number(a.info.episode || Infinity) - Number(b.info.episode || Infinity) || nameOf(a.file).localeCompare(nameOf(b.file), 'zh-CN', { numeric: true }))) addRow(item);
        }
        if (panels.length) collapse = window.__guangyaNativeUI.mountCollapse(lists, { items: panels, accordion: true, defaultActiveKey: [`Season ${initial[0]}`] });
        if (!buckets.size) { const empty = document.createElement('p'); empty.textContent = '暂无可展示的文件，请先检查命名规则'; lists.append(empty); }
        const note = document.createElement('p'); note.dataset.detailsNote = ''; note.textContent = '仅展示预览，不会修改文件'; detail.footer.append(note);
        detail.addButton('关闭', { onClick: () => detail.close() });
      } catch (error) { detail.close('destroy'); throw error; }
    }
    function setGroupStatus(group, text, state = '') {
      const badge = groupRows.get(group);
      if (badge) badge.update(text, state === 'failed' ? 'error' : state || (text === '整理中' ? 'processing' : 'default'));
    }
    function seasonSummary(group) {
      if (isMovie) return '';
      const seasons = new Map();
      for (const item of current.items.filter(item => item.group === group && item.info.label)) {
        const season = Number(item.info.season);
        if (!seasons.has(season)) seasons.set(season, new Set());
        if (!item.error) seasons.get(season).add(item.info.episode);
      }
      return [...seasons].sort((a, b) => a[0] - b[0]).map(([season, episodes]) => {
        const total = group.seasons.find(item => Number(item.season_number) === season)?.episode_count;
        return `${season === 0 ? '特别篇' : season + '季'} ${episodes.size}/${total > 0 ? total : '?'}集`;
      }).join('｜');
    }
    function applyFilter() {
      const rows = [...card.body.querySelectorAll('[data-tv-group]')];
      for (const row of rows) row.hidden = onlyUnmatched && row.dataset.tvUnmatched !== 'true';
      card.body.querySelector('[data-tv-empty]').hidden = !onlyUnmatched || rows.some(row => !row.hidden);
    }
    function render() {
      if (finished) return;
      for (const input of [...groupInputs, ...groupTags, ...detailLinks]) input.destroy();
      groupInputs = []; groupTags = []; detailLinks = []; groupRows.clear(); card.body.replaceChildren();
      const header = document.createElement('div'); header.dataset.tvColumns = ''; header.dataset.tvTableHead = ''; header.setAttribute('role', 'row');
      for (const text of [isMovie ? '原文件' : '原文件夹', '目标路径', '状态']) { const cell = document.createElement('span'); cell.textContent = text; cell.setAttribute('role', 'columnheader'); header.append(cell); }
      card.body.append(header);
      try { current = makePlan(groups, ruleInput.value); }
      catch (error) { current = { items: [], changed: 0, error: error.message }; }
      summary.textContent = current.error || (scanned && isMovie && !groups.length ? '未找到大于 10MB 的视频' : scanned ? `匹配 ${groups.filter(group => group.match).length}/${groups.length} 部 · 可整理 ${current.changed} ${unit} · 确认后才会修改文件` : `已选中 ${folders.length} 个${isMovie ? '文件或文件夹' : '文件夹'}`);
      const previewGroups = scanned || (isMovie && groups.length) ? groups : folders.map(folder => groups.find(group => idOf(group.folder) === idOf(folder)) || { folder, scanned: false });
      for (const [index, group] of previewGroups.entries()) {
        const complete = scanned || group.scanned;
        const section = document.createElement('section'); section.dataset.tvGroup = ''; section.setAttribute('role', 'rowgroup');
        section.dataset.tvUnmatched = String(!!complete && !group.match);
        const row = document.createElement('div'); row.dataset.tvColumns = ''; row.setAttribute('role', 'row');
        const original = document.createElement('span'); original.dataset.tvSource = ''; original.setAttribute('role', 'cell');
        groupTags.push(window.__guangyaNativeUI.mountTooltip(original, { text: isMovie ? group.entries?.[0]?.sourcePath || nameOf(group.folder) : nameOf(group.folder) }));
        const target = document.createElement('span'); target.dataset.tvTarget = ''; target.setAttribute('role', 'cell');
        target.dataset.tvPending = String(!complete);
        target.textContent = !complete ? `待扫描${mediaName}` : group.folderName ? [group.folderName, seasonSummary(group)].filter(Boolean).join('｜') : group.error || '未匹配';
        if (complete && group.match && group.folderName) {
          const text = target.textContent; target.replaceChildren();
          detailLinks.push(window.__guangyaNativeUI.mountTooltip(target, { text, onClick: () => showDetails(group) }));
        }
        else { const text = target.textContent; target.replaceChildren(); groupTags.push(window.__guangyaNativeUI.mountTooltip(target, { text })); }
        const actions = document.createElement('span'); actions.dataset.tvActions = ''; actions.setAttribute('role', 'cell');
        const correct = document.createElement('span'); correct.dataset.tvCorrect = '';
        const badge = document.createElement('span'); badge.setAttribute('role', 'status');
        const tag = window.__guangyaNativeUI.mountTag(badge, { text: !complete ? '待整理' : !group.match ? '未匹配' : current.items.some(item => item.group === group && !item.error) ? '待整理' : '已跳过' });
        groupTags.push(tag); groupRows.set(group, tag);
        if (scanned) actions.append(correct);
        actions.append(badge); row.append(original, target, actions);
        if (!scanned) { section.append(row); card.body.append(section); continue; }
        const correctTag = window.__guangyaNativeUI.mountTag(correct, {
          text: '纠错', color: 'processing', showIcon: false, hasPopup: 'dialog', ariaControls: `guangya-${type}-correction-dialog`,
          onClick: () => showCorrection(group),
        });
        groupInputs.push(correctTag); section.append(row);
        card.body.append(section);
      }
      const empty = document.createElement('div'); empty.dataset.tvEmpty = ''; empty.textContent = '暂无未匹配项'; card.body.append(empty);
      applyFilter(); setBusy(busy);
    }
    try {
      unmatchedFilter = window.__guangyaNativeUI.mountSwitch(root.querySelector('[data-tv-filter-switch]'), { size: 'small', ariaLabel: '过滤', onChange(checked) { onlyUnmatched = checked; applyFilter(); } });
      ruleInput = window.__guangyaNativeUI.mountSelect(root.querySelector('[data-tv-rule]'), { mode: 'multiple', size: 'large', value: [...defaultFields], options: allowedFields.map(value => ({ value, label: value })), ariaLabel: `${mediaName}命名字段`, placeholder: '请选择命名字段', onChange() { updateRuleExample(); render(); } });
      function updateRuleExample() {
        const example = root.querySelector('[data-tv-rule-example]');
        try {
          const info = isMovie ? parseMovie('盗梦空间.2010.2160p.WEB-DL.H265.HDR.AAC.mkv') : parseEpisode('仙逆.S01E01.2026.2160p.WEB-DL.H265.HDR.AAC.mkv', '仙逆.2026');
          const group = { info, match: isMovie ? { id: 27205, title: '盗梦空间', year: '2010' } : { id: 239660, title: '仙逆', year: '2026' }, entries: [{ file: { fileId: 'naming-example' }, info }] };
          example.textContent = '命名示例：' + makePlan([group], ruleInput.value).items[0].newName;
        } catch (error) { example.textContent = error.message; }
      }
      updateRuleExample();
      card = window.__guangyaNativeUI.mountCard(root.querySelector('[data-tv-preview]'));
      card.body.setAttribute('role', 'table'); card.body.setAttribute('aria-label', `${mediaName}整理预览`);
      render();
    } catch (error) { modal.close('destroy'); throw error; }
    return modal;
  }
  const api = { run, scan, makePlan, execute, parseEpisode, parseMovie, search, requestTmdb, destroy() {
    destroyed = true; stopping = true; configurationView?.close('destroy'); view?.close('destroy');
    if (window[key] === api) delete window[key];
  } };
  window[key] = api;
  console.info(prefix, `${mediaName}整理组件已安装`);
});
