(() => {
  const key = '__guangyaNativeUI';
  window[key]?.destroy();
  document.getElementById('guangya-native-input-style')?.remove();
  const instances = new Set();
  let runtime;
  let destroyed = false;

  function resolveRuntime() {
    if (runtime) return runtime;
    let require;
    window.webpackChunk_swangpan_pc?.push([['guangya-native-ui-' + Date.now()], {}, value => { require = value; }]);
    if (!require?.m) throw Error('无法定位应用组件，请更新云助手脚本');
    const modules = Object.entries(require.m).map(([id, factory]) => ({ id, source: String(factory) }));
    function find(sourceMatches, matches) {
      for (const { id, source } of modules) {
        if (!sourceMatches(source)) continue;
        const exports = require(id);
        for (const value of [exports, ...Object.values(exports ?? {})]) if (value && matches(value)) return value;
      }
      throw Error('当前应用版本的原生组件不兼容');
    }
    const React = find(source => source.includes('react.transitional.element') || source.includes('react.element'), value => typeof value.createElement === 'function' && typeof value.useState === 'function');
    const client = find(source => source.includes('createRoot') && source.includes('hydrateRoot'), value => typeof value.createRoot === 'function');
    const dom = find(source => source.includes('flushSync') && source.includes('createPortal'), value => typeof value.flushSync === 'function' && typeof value.createPortal === 'function');
    const Input = find(source => /\.TextArea\s*=/.test(source) && source.includes('Password'), value => !!value.TextArea && !!value.Password);
    const Dropdown = find(source => source.includes('dropdownRender') && source.includes('destroyOnHidden') && /\.Button\s*=/.test(source), value => typeof value === 'function' && !!value.Button);
    const Switch = find(source => source.includes('__ANT_SWITCH'), value => !!value.__ANT_SWITCH);
    const Select = find(source => source.includes('SECRET_COMBOBOX_MODE_DO_NOT_USE') && /\.Option\s*=/.test(source), value => !!value.Option && !!value.OptGroup);
    const Button = find(source => source.includes('__ANT_BUTTON'), value => !!value.__ANT_BUTTON);
    runtime = { React, client, dom, Input, TextArea: Input.TextArea, Dropdown, Switch, Select, Button };
    return runtime;
  }

  function themeProviders() {
    const anchor = document.querySelector('main');
    const key = Object.keys(anchor ?? {}).find(name => name.startsWith('__reactFiber$'));
    const providers = [];
    for (let fiber = anchor?.[key]; fiber; fiber = fiber.return) {
      if (fiber.tag !== 10) continue;
      const value = fiber.memoizedProps?.value;
      if (typeof value?.getPrefixCls === 'function' || (value?.token && value?.theme)) providers.push({ type: fiber.type, value });
    }
    if (!providers.some(provider => typeof provider.value.getPrefixCls === 'function') || !providers.some(provider => provider.value.token)) throw Error('未找到应用原生主题，请回到文件列表后重试');
    return providers;
  }

  function mountTextArea(host, { placeholder = '可以选择导入秒传文件，也可以直接填写秒传格式的内容', ariaLabel = '秒传内容' } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, TextArea } = resolveRuntime();
    // A new React root does not inherit app context; reuse the app's live providers.
    const providers = themeProviders();
    const root = client.createRoot(host);
    let value = '', disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(TextArea, {
        rows: 5, autoSize: { minRows: 7, maxRows: 10 }, value, disabled,
        placeholder, 'aria-label': ariaLabel, spellCheck: false,
        onChange(event) { value = event.target.value; render(); },
      });
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('textarea'); },
      get value() { return value; },
      set value(next) { value = String(next); render(); },
      get hidden() { return host.hidden; },
      set hidden(next) { host.hidden = Boolean(next); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      focus() { handle.element?.focus(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try {
      render();
      if (!handle.element) throw Error('原生输入框渲染失败');
      return handle;
    } catch (error) { handle.destroy(); throw error; }
  }

  function mountInput(host, { value: initial = '', placeholder = '', ariaLabel = '输入内容', size = 'middle', type = 'text', variant, style, actions = [], onChange } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, Input } = resolveRuntime();
    const providers = themeProviders();
    const root = client.createRoot(host);
    let value = String(initial), disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(Input, { value, disabled, size, type, variant, style, placeholder, 'aria-label': ariaLabel,
        suffix: actions.length ? React.createElement('span', { 'data-input-actions': '' }, actions.map(action =>
          React.createElement('button', { key: action.key, type: 'button', disabled, title: action.title,
            'aria-label': action.title, 'aria-pressed': action.pressed(), 'data-input-action': action.key,
            onMouseDown(event) { event.preventDefault(); },
            onClick() { action.onClick(); render(); },
          }, action.icon ? React.createElement('span', { 'aria-hidden': true, dangerouslySetInnerHTML: { __html: action.icon } }) : action.label))) : undefined,
        onChange(event) { value = event.target.value; render(); onChange?.(value); },
      });
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('input'); },
      get value() { return value; },
      set value(next) { value = String(next); render(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountButton(host, { text, size = 'middle', type = 'default', onClick } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, Button } = resolveRuntime();
    const providers = themeProviders();
    const root = client.createRoot(host);
    let disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(Button, { size, type, disabled, onClick, htmlType: 'button' }, text);
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('button'); },
      set text(next) { text = String(next); render(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountTooltip(host, { text, title = text, onClick } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, Button } = resolveRuntime();
    const { Tooltip, ConfigProvider } = resolveBundledComponents();
    const providers = themeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function').value;
    const root = client.createRoot(host);
    let disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      const label = React.createElement('span', { 'data-tv-path-text': '' }, text);
      const trigger = onClick ? React.createElement(Button, { type: 'link', disabled, onClick, htmlType: 'button' }, label) : React.createElement('span', { tabIndex: 0, style: { display: 'block' } }, label);
      let node = React.createElement(ConfigProvider, { ...config, prefixCls: config.getPrefixCls('') },
        React.createElement(Tooltip, { title, placement: 'bottomLeft', getPopupContainer: () => host.closest('dialog') || document.body }, trigger));
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('button') || host.firstElementChild; },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountSelect(host, { options, value: initial, mode, size = 'middle', onChange, ariaLabel = '选项', placeholder = '请选择' } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, Select } = resolveRuntime();
    const providers = themeProviders();
    const root = client.createRoot(host);
    let value = initial, disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(Select, { options, value, mode, disabled, size, placeholder, style: { width: '100%' },
        'aria-label': ariaLabel, getPopupContainer: () => host.closest('dialog') || document.body,
        onChange(next) { value = next; render(); onChange?.(next); },
      });
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('.ant-select'); },
      get value() { return value; },
      set value(next) { value = next; render(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountSwitch(host, { checked: initial = false, size = 'default', onChange, ariaLabel = '开关' } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom, Switch } = resolveRuntime();
    const providers = themeProviders();
    const root = client.createRoot(host);
    let checked = Boolean(initial), disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(Switch, { checked, disabled, size, 'aria-label': ariaLabel,
        onChange(next) { checked = next; render(); onChange?.(next); },
      });
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('[role="switch"]'); },
      get checked() { return checked; },
      set checked(next) { checked = Boolean(next); render(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function resolveBundledComponents() {
    const runtime = resolveRuntime();
    if (!runtime.segmented) {
      if (!window.__guangyaLoadSegmented) throw Error('原生组件未加载，请通过启动器重新注入');
      runtime.segmented = window.__guangyaLoadSegmented(runtime);
    }
    return runtime.segmented;
  }

  function mountTag(host, { text: initialText, status: initialStatus = 'default', variant = 'outlined', color, showIcon = true, onClick, ariaControls, hasPopup, expanded: initialExpanded = false } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom } = resolveRuntime();
    const { Tag, StatusIcons, ConfigProvider } = resolveBundledComponents();
    const providers = themeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function').value;
    const root = client.createRoot(host);
    let text = initialText, status = initialStatus, disabled = false, expanded = initialExpanded, disposed = false;
    function render() {
      if (disposed) return;
      if (showIcon) host.dataset.tvState = status;
      const icon = showIcon ? React.createElement(StatusIcons[status], { spin: status === 'processing' }) : undefined;
      let node = React.createElement(ConfigProvider, { ...config, prefixCls: config.getPrefixCls('') },
        React.createElement(Tag, { color: color || status, icon, variant,
          role: onClick ? 'button' : undefined, tabIndex: onClick ? (disabled ? -1 : 0) : undefined,
          'aria-controls': ariaControls, 'aria-haspopup': hasPopup, 'aria-expanded': onClick && !hasPopup ? expanded : undefined, 'aria-disabled': onClick ? disabled : undefined,
          onClick: onClick ? event => { if (!disabled) onClick(event); } : undefined,
          onKeyDown: onClick ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!disabled) onClick(event); } } : undefined,
          style: { marginInlineEnd: 0, cursor: onClick ? (disabled ? 'not-allowed' : 'pointer') : undefined, opacity: onClick && disabled ? .5 : undefined },
        }, text));
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('.ant-tag'); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      set expanded(next) { expanded = Boolean(next); render(); },
      update(nextText, nextStatus = 'default') {
        if (!Object.hasOwn(StatusIcons, nextStatus)) throw Error('不支持的状态标签');
        text = nextText; status = nextStatus; render();
      },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { handle.update(text, status); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountCard(host, { size = 'small', variant = 'outlined' } = {}) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom } = resolveRuntime();
    const { Card, ConfigProvider } = resolveBundledComponents();
    const providers = themeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function').value;
    const root = client.createRoot(host);
    let disposed = false;
    const handle = {
      get element() { return host.querySelector('.ant-card'); },
      get body() { return host.querySelector('[data-native-card-content]'); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try {
      let node = React.createElement(ConfigProvider, { ...config, prefixCls: config.getPrefixCls('') },
        React.createElement(Card, { size, variant }, React.createElement('div', { 'data-native-card-content': '', className: 'ant-card-body-content' })));
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
      if (!handle.body) throw Error('原生 Card 渲染失败');
      return handle;
    } catch (error) { handle.destroy(); throw error; }
  }

  function mountCollapse(host, { items, defaultActiveKey = [], accordion = false }) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom } = resolveRuntime();
    const { Collapse, ConfigProvider } = resolveBundledComponents();
    const providers = themeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function').value;
    const root = client.createRoot(host);
    let disposed = false;
    const handle = {
      get element() { return host.querySelector('.ant-collapse'); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    const content = element => React.createElement('div', { ref: host => { if (host && element.parentElement !== host) host.append(element); } });
    instances.add(handle);
    try {
      let node = React.createElement(ConfigProvider, { ...config, prefixCls: config.getPrefixCls('') },
        React.createElement(Collapse, { defaultActiveKey, accordion, items: items.map(item => ({ key: item.key, label: content(item.label), extra: item.extra && content(item.extra), children: content(item.children), forceRender: true })) }));
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
      if (!handle.element) throw Error('原生 Collapse 渲染失败');
      return handle;
    } catch (error) { handle.destroy(); throw error; }
  }

  function mountSegmented(host, { options, value: initial, block = false, size = 'middle', onChange, ariaLabel = '选项' }) {
    if (destroyed) throw Error('原生组件已卸载，请重新打开弹窗');
    const { React, client, dom } = resolveRuntime();
    const { Segmented, ConfigProvider } = resolveBundledComponents();
    const providers = themeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function').value;
    const root = client.createRoot(host);
    let value = initial, disabled = false, disposed = false;
    function render() {
      if (disposed) return;
      let node = React.createElement(ConfigProvider, { ...config, prefixCls: config.getPrefixCls('') },
        React.createElement(Segmented, { options, value, block, size, disabled, 'aria-label': ariaLabel,
          onChange(next) { value = next; render(); onChange?.(next); },
        }));
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('.ant-segmented'); },
      get value() { return value; },
      set value(next) { value = next; render(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); render(); },
      destroy() { if (disposed) return; disposed = true; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  function mountDropdown(host, { button, items, menuId, onAction }) {
    if (destroyed) throw Error('原生组件已卸载，请重新注入');
    const { React, client, dom, Dropdown } = resolveRuntime();
    const providers = themeProviders();
    const root = client.createRoot(host);
    const attributes = Object.fromEntries([...button.attributes].filter(attribute => attribute.name !== 'class').map(attribute => [attribute.name, attribute.value]));
    let className = button.className, open = false, disposed = false;
    function setOpen(next, focus = false) {
      if (disposed) return;
      if (open !== next) { open = next; render(); }
      if (!next && focus) handle.element?.focus();
    }
    function render() {
      if (disposed) return;
      const trigger = React.createElement('button', {
        ...attributes, className, 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': menuId,
        dangerouslySetInnerHTML: { __html: button.innerHTML },
        onKeyDown(event) {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault(); setOpen(true);
          setTimeout(() => {
            if (!open || disposed) return;
            const rows = document.getElementById(menuId)?.querySelectorAll('[role="menuitem"]');
            rows?.[event.key === 'ArrowUp' ? rows.length - 1 : 0]?.focus();
          }, 0);
        },
      });
      let node = React.createElement(Dropdown, {
        trigger: ['click'], placement: 'bottomLeft', autoFocus: true, destroyOnHidden: true,
        open, onOpenChange: next => setOpen(next), overlayStyle: { minWidth: 140 },
        popupRender: menu => React.cloneElement(menu, { id: menuId }),
        menu: {
          autoFocus: true,
          items: items.map(item => ({ key: item.action, label: React.createElement('span', { 'data-action': item.action }, item.name) })),
          onClick({ key: action }) { setOpen(false, true); queueMicrotask(() => onAction(action)); },
          onKeyDown(event) {
            if (event.key === 'Escape' || event.key === 'Tab') { if (event.key === 'Escape') event.preventDefault(); setOpen(false, event.key === 'Escape'); }
          },
        },
      }, trigger);
      for (const provider of providers) node = React.createElement(provider.type, { value: provider.value }, node);
      dom.flushSync(() => root.render(node));
    }
    const handle = {
      get element() { return host.querySelector('button'); },
      close() { setOpen(false); },
      setClassName(next) { if (className === next) return; className = next; render(); },
      destroy() { if (disposed) return; disposed = true; open = false; root.unmount(); instances.delete(handle); },
    };
    instances.add(handle);
    try { render(); return handle; } catch (error) { handle.destroy(); throw error; }
  }

  window[key] = { mountTextArea, mountInput, mountButton, mountTooltip, mountSelect, mountSwitch, mountTag, mountCard, mountCollapse, mountDropdown, mountSegmented, destroy() { destroyed = true; for (const instance of [...instances]) instance.destroy(); if (window[key] === this) delete window[key]; } };
})();
