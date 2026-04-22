// ==UserScript==
// @name         123云盘文件批量重命名助手
// @name:en      123FastRename
// @namespace    http://tampermonkey.net/
// @version      1.0.8
// @description  123云盘文件批量重命名助手（已被123云盘官方支持），支持按序号、追加、查找替换、正则替换、格式替换等多种重命名模式，提供拖拽排序、实时预览、历史记录等功能
// @supportURL   https://bbs.tampermonkey.net.cn/thread-10041-1-1.html
// @homepageURL  https://github.com/meguoe/123FastLinkPlus
// @updateURL    https://raw.githubusercontent.com/meguoe/123FastLinkPlus/refs/heads/main/123FastRename.js
// @downloadURL  https://raw.githubusercontent.com/meguoe/123FastLinkPlus/refs/heads/main/123FastRename.js
// @author       meguoe
// @license      Apache-2.0
// @match        *://*.123pan.com/*
// @match        *://*.123pan.cn/*
// @match        *://*.123684.com/*
// @match        *://*.123865.com/*
// @icon         data:image/x-icon;base64,AAABAAEAQEAAAAEAIAAoQgAAFgAAACgAAABAAAAAgAAAAAEAIAAAAAAAAEAAAMMOAADDDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPt8WAD7fFgC+3xYB/t8WBf7fFhQ+3xYkPt8WMD7fFji+3xY9Px9Wfr8fVn7+3xY+/x9Wfv7fFj7/H1Z+/t8WPv8fVn7/H1Z+/x9Wfv8fVn7/H1Z+/x9Wfv7fVn7+31Z+/t9Wfv7fVn7/H1Z+/x9Wfv8fVn7+3xY+/x9Wfv7fFj7/H1Z+/x9Wfv8fVn7/H1Z+/x9Wfv8fVn7/H1Z+/x9Wfr7fFj1+3xY5Pt8WMP7fFiU+3xYVPt8WBn7fFgI+3xYAvt8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAD7fFgF+3xYJft8WIL7fFjV/H1Z8ft9Wff8fVn6+31Z/ft9Wf78fVn//H1Z//x9Wf/8fVn//H1Z//t9Wf/8fVn/+31Z//x9Wf/8fVn//H1Z//t9Wf/7fVn/+31Y//t9Wf/7fVn/+31Z//x9WP/8fVn/+31Z//x9Wf/7fVn//H1Z//t9Wf/8fVn/+31Z//x9Wf/8fVn//H1Z//t9Wf/8fVn/+31Z/vt9Wf38fVn7/H1Z9/x9WfL7fFjZ+3xYift8WCr7fFgG+3xYAft8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAH7fFgQ+3xYc/t8WNn8fVn1/H1Z/fx9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z/fx9Wfb7fFjd+3xYfPt8WBP7fFgC+3xYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAL7fFgm+3xYrvt9We/7fVn9+31Z//t8Wf/7fFj/+3xY//t9Wf/7fVn/+31Z//t9Wf/7fFj/+3xY//t8Wf/7fVn/+31Z//t9Wf/7fFj/+3xY//t8Wf/7fVn/+31Z//t9Wf/7fVj/+3xY//t8WP/7fFj/+31Y//t9Wf/7fVn/+31Z//t8Wf/7fFj/+3xY//t9Wf/7fVn/+31Z//t8Wf/7fFj/+3xY//t9Wf/7fVn/+31Z//t9Wf/7fFj/+3xY//t8Wf/7fVn/+31Z/vt9WfD7fFi2+3xYLft8WAP7fFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAL7fFgx+3xYxvt9Wff7fFj/+3xY//t8WP/7fVn/+3xY//t8WP/7fVj/+31Z//t9Wf/7fVj/+3xY//t8WP/7fVn/+3xY//t8WP/7fFj/+31Z//t9WP/7fFj/+3xY//t8WP/7fVj/+31Y//t8WP/7fFj/+3xY//t9WP/7fFj/+3xY//t8WP/7fVj/+31Y//t9Wf/7fFj/+3xY//t8WP/7fVn/+3xY//t8WP/7fVj/+31Z//t9Wf/7fVj/+3xY//t8WP/7fVn/+3xY//t8WP/7fFj/+31Z+ft8WMz7fFg5+3xYA/t8WAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAH7fFgp+3xYxvx9WPn8fVj//H1Y//x9Wf/8fVj//H1Y//x9WP/8fVn//H1Y//x9WP/8fVj//H1Z//x9WP/8fVj//H1Y//x9Wf/8fVj//H1Y//x9WP/8fVn//H1Y//x9WP/8fVj//H1Z//x9WP/8fVj//H1Y//x9WP/8fVn//H1Y//x9WP/8fVj//H1Z//x9WP/8fVj//H1Y//x9Wf/8fVj//H1Y//x9WP/8fVn//H1Y//x9WP/8fVj//H1Z//x9WP/8fVj//H1Y//x9Wf/8fVj//H1Y//x9WP/8fVn7+3xYzft8WDH7fFgC+3xYAAAAAAAAAAAAAAAAAPt8WAH7fFgT+3xYtfx9Wfj7fVj//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//t9WP/8fVn//H1Z//t9Wf/8fVn//H1Z//x9Wf/8fVn/+31Y//x9Wf/8fVn//H1Z//x9Wf/7fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn/+31Z//x9Wf/7fVj//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//t9WP/8fVn//H1Z//t9Wf/8fVn//H1Z//x9Wf/8fVn/+31Y//x9Wf/8fVn//H1Z//x9Wfn7fFi++3xYGft8WAEAAAAAAAAAAPt8WAD7fFgG+3xYgfx9WfD8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z8/t8WI/7fFgG+3xYAAAAAAD7fFgC+3xYMft8WOD8fFn+/HxZ//x8Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fFn//HxZ//x8Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fFn//HxZ//x8Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fFn//HxZ//x8Wf77fFjk+3xYPPt8WAMAAAAA+3xYB/t8WJb7fFj3+3xY//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFj/+3xZ//t8WP/7fFn/+3xZ//t8Wf/7fFn/+3xY//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFj/+3xZ//t8WP/7fFn/+3xZ//t8Wf/7fFn/+3xY//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFj/+3xY+Pt8WKT7fFgI+3xYAft8WCL7fFjg/HxY/vx8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP77fFnm+3xYLft8WAX7fFhj/HxY8/x8Wf/7fFj/+3xY//x8Wf/7fFj/+3xZ//x8WP/8fFj/+3xZ//x8Wf/8fFj//HxZ//x8Wf/8fFn//HxZ//x8WP/8fFn/+3xZ//x8WP/8fFn/+3xZ//t8WP/8fFj//HxY//t8WP/8fFj//HxY//x8WP/8fFj//HxZ//x8WP/8fFj//HxY//x8WP/7fFj//HxY//x8Wf/7fFj/+3xZ//x8WP/8fFj/+3xZ//x8Wf/8fFj//HxZ//x8Wf/8fFn//HxZ//x8WP/8fFn/+3xZ//x8WP/8fFn/+3xZ//t8WP/8fFj/+3xY//t8WP/8fFn//HxY9Pt8WHL7fFgJ+3xYovt8Wfn8fFn//HxZ//t8Wf/8fFn/+3xY//x8Wf/8fVn/+3xY//x8Wf/8fFn//H1Z//x8Wf/7fFn/+3xZ//t8Wf/7fFn//HxZ//x8Wf/7fFj//HxZ//x8Wf/7fFj//H1Y//x8Wf/8fFn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fFn/+3xZ//x8Wf/8fFn/+3xZ//t8Wf/8fFn/+3xY//x8Wf/8fVn/+3xY//x8Wf/8fFn//H1Z//x8Wf/7fFn/+3xZ//t8Wf/7fFn//HxZ//x8Wf/7fFj//HxZ//x8Wf/7fFj//H1Z//x8Wf/8fFn//HxZ//x9Wfr7fFix+3xYDPt8WND7fVj9+31Z//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVn/+31Y//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Y//t9WP/7fVn/+31Z//t9Wf/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVn/+31Y//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9Wf/7fVn++3xY3Pt8WBn7fFjo/H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9WO37fFgm+3xY7/t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFjw+3xYLPx8WPD8fVn//H1Z//x9Wf/8fVj++3xZw/t8WK77fFit+3xYrft8WK37fFis/HxY2Px8WPr8fFj/+3xY3/t8WLb7fFis+3xYrft8WK37fFit+3xYrft8WK37fFit+3xYrft8WK37fFit+3xYrft8WK37fFit+3xYrft8WK37fFit+3xYrft8WKv7fFjC/HxY7/x9WP/8fFj//HxY5/t8WLb7fFis+3xYrft8WK37fFit+3xYrft8WK37fFit+3xYr/t8WLP7fFi8+3xYzPt8WOf7fFj//HxY//x8WP/8fVj//H1Y//x8WP/8fVj//H1Z//x9Wf/8fVn//HxY8ft8WCz7fVjw/H1Y//t9WP/7fVj//H1Y/Pt8WV77fFgn+3xYI/t8WCP7fFgj+3xYIvx9WZb8fVjx+31Y//t8WKn7fFg7+3xYIft8WCP7fFgj+3xYI/t8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Wf/7fVn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+31Z//t9Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFnk+3xYXvt8WAAAAAAAAAAAAPt8WAD7fFgD+3xYOft8Wfv7fFn/+3xZ//t8Wf/7fFnx+3xYLPx8WfD8fFn//HxZ//x8Wf/8fVn7+3xZRPt8WQX7fFkAAAAAAAAAAAD8fFkA/HxZhfx9We/8fFn/+3xYoft8WB77fFgAAAAAAAAAAAD7fFgA+3xYSft8WdP8fFn//HxZ//x9Wf/8fVn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fVn//H1Z//x8Wf/8fFn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fFn//HxZ//x8Wf/8fFn//H1Z6vt8WHX7fFgAAAAAAAAAAAD7fFgA+3xYBft8WEL8fVn7/HxZ//x8Wf/8fFn//HxZ8ft8WCz7fFjw+3xY//t8WP/7fFj/+3xY+/t8WUT7fFkF+3xZAAAAAAAAAAAA/H1YAPx9WIX8fFjv+3xY//t8WLD7fFgj+3xYAAAAAAAAAAAA+3xYAPt8WCf7fFjB+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WOD7fFhL+3xYAAAAAAAAAAAA+3xYAPt8WAn7fFhi+3xY/Pt8WP/7fFj/+3xY//t8WPH7fFgs+3xY8Pt8Wf/7fFn/+3xY//t8WPv7fFlE+3xZBft8WQAAAAAAAAAAAPx9WQD8fVmF+3xZ7/t8Wf/7fFjM+3xYLPt8WAAAAAAAAAAAAPt8WAD7fFgF+3xYd/t8WOf7fFj/+3xZ//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFj/+3xY//t8Wf/7fFj/+3xY//t8WP/7fFn/+3xZ//t8WP/7fFj/+3xY//t8WP/7fFn/+3xZ//t8WP/7fFj/+3xY//t8WOn7fFiG+3xYEft8WAAAAAAAAAAAAPt8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WO/7fFj/+3xY//t8WP/7fFj/+3xY8ft8WCz8fVjw/H1Y//x9WP/8fVj//H1Y+/t8WET7fFkF+3xZAAAAAAAAAAAA/H1ZAPx9WYX8fVnv/H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/7fVj2+3xYkft8WB37fFgAAAAAAAAAAAD7fFgA+ntXAvt8WHn7fFj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//t9WP/7fFj6+3xY0/t8WHT7fFgM+3xYAAAAAAAAAAAA+3xYAPt8WBb7fFi1/HxY/fx9WP/8fVj//H1Y//x9WPH7fFgs+31Z8Pt9Wf/7fVn/+31Z//t9Wfv7fFlE+3xYBft8WAAAAAAAAAAAAPx9WQD8fVmF+31Z7/t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wdn7fFhO+3xYAAAAAAAAAAAA+XpWAPt8WAD7fFhp+3xY//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fFjd+3xYQPt8WAAAAAAAAAAAAPt8WAD7fFgL+3xYcPt9Wfz7fVn/+31Z//t9Wf/7fVnx+3xYLPx9WfD8fVj//H1Z//x9Wf/8fVn7+3xZRPt8WQX7fFkAAAAAAAAAAAD7fFgA+3xYhfx9WO/8fVn//H1Z//x9Wf/8fVn//H1Z//x9WP/8fVj//H1Z//x9Wf/8fVn//H1Y//x9Wf/8fVn//H1Z//x9Wf/8fVno+3xYXPt8WAAAAAAAAAAAAAAAAAD7fFgA+3xYZPt8WPr8fVn//H1Z//x9WP/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Y6Pt8WGz7fFgAAAAAAAAAAAD7fFgA+3xYBvt8WEv8fVn7/H1Z//x9Wf/8fVj//H1Z8ft8WCz8fVnw/H1Z//x9Wf/8fVn//H1Z+/t8WET7fFgF+3xYAAAAAAAAAAAA/HxZAPx8WYX8fVnv/H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9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WDP7fFg/+3xYY/t8WK77fFjv+3xY//t8WP/7fFj/+3xY//t8WP/7fFjA+3xYQfx9WSf8fVkp/H1ZKfx9WSn8fVkp/H1ZKfx9WSn8fVkp/H1YKft8WCv7fFgv+3xYN/t8WFL7fFiV+3xY6vt8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFjx+3xYK/x8WPD8fFj//HxY//x8WP/8fFj++3xZy/x9Wbn8fVm4/H1ZuPx9Wbj8fVm4/H1Z3fx8WPr8fFj//HxY+/x8WMj8fVm3/H1ZuPx9Wbj8fVm4/H1ZuPx9Wbj8fVm4/H1ZuPx9Wbj8fVi4+3xYuft8WMD7fFjS+3xY7fx8WP78fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY6vx8WMD8fVm3/H1ZuPx9Wbj8fVm4/H1ZuPx9Wbj8fVm4/H1YuPx9WLn7fFi++3xYx/t8WNz7fFj7/HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY8ft8WCX8fFnu/HxY//x8WP/8fFj//HxY//x8Wf/8fFj//HxY//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj/+3xY//t8WP/8fFn//HxZ//x8Wf/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxZ//x8Wf/8fFj//HxY//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj//H1Z//x8WP/8fFj/+3xY//x8WP/8fFn//HxY//x8Wf/8fFj//HxY//x8WfD7fFgX+3xY5ft9WP77fVj/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVj/+31Z//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Z//t9WP/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9WP/7fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Z//t9WP/7fVn/+31Y//t9Wf/7fVj/+31Z//t9Wf/7fVn/+31Y//t9WP/7fVjr+3xYDPt8WM38fVn8/H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn9+3xY2vt8WAn7fFie+3xY+Pt8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t9WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t9WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY//t8WP/7fFj/+3xY+vt8WK37fFgF+3xYXvt9WPL7fVj/+3xY//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fFj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+3xY//t9WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t8WP/7fVj/+31Y//t9WP/7fVj/+31Y//t8WP/7fFj/+31Y//t9WPT7fFhs+3xYAft8WB77fFjd/H1Y/vx9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fFj//H1Y//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fFj//H1Y//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP/8fVj//H1Y//x9WP77fFjj+3xYKQAAAAD7fFgH+3xYkPt9Wfb7fVj//H1Y//t9WP/7fVj/+31Z//t9WP/7fVj/+31Y//x9Wf/7fVj/+31Z//t9WP/7fVj/+31Z//t9WP/8fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj//H1Y//t9WP/7fVn/+31Z//t9Wf/7fVn/+31Y//t9Wf/7fVn/+31Z//t9Wf/7fVj//H1Y//t9WP/7fVj/+31Z//t9WP/7fVj/+31Y//x9Wf/7fVj/+31Z//t9WP/7fVj/+31Z//t9WP/8fVn/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj//H1Y//t9WP/7fVn4+3xYnvt8WAcAAAAA+3xYAvt8WCv7fFjc+31Z/ft9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn++3xY4vt8WDb7fFgCAAAAAPt8WAD7fFgF+3xYefx9We78fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z//x9Wf/8fVn//H1Z8ft8WIb7fFgG+3xYAAAAAAAAAAAA+3xYAPt8WBD7fFiu+31Z9vt9Wf/7fVn/+31Z//t9Wf/7fVn/+3xZ//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+3xZ//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t8Wf/7fVn/+3xZ//t8Wf/7fVn/+31Z//t9Wf/7fFn/+3xZ//t9Wf/7fFn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+3xZ//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z//t9Wf/7fVn/+3xZ//t9Wf/7fVn/+31Z//t9Wf/7fVn/+31Z+Pt8WLf7fFgV+3xYAQAAAAAAAAAAAAAAAPt8WAD7fFgB+3xYI/t8WMD8fFj4/HxY//x8Wf/8fFj//HxZ//x8WP/8fFj//HxY//x8WP/8fFn//HxZ//x8WP/8fFj//HxY//x8WP/8fFn//HxY//x8Wf/8fFj//HxY//x8WP/8fFj//HxY//x8Wf/8fFj//HxY//x8WP/8fFj//HxY//x8Wf/8fFn//HxY//x8WP/8fFj//HxY//x8Wf/8fFj//HxZ//x8WP/8fFj//HxY//x8WP/8fFn//HxZ//x8WP/8fFj//HxY//x8WP/8fFn//HxY//x8Wf/8fFj//HxY+vt8WMj7fFgr+3xYAvt8WAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAL7fFgr+3xYvvx8WPX8fFn+/HxY//x8WP/8fFj//HxY//x8WP/8fFn//HxZ//x8Wf/8fFn//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY//x8WP/8fFn//HxY//x8WP/8fFj//HxY//x8WP/8fFn//HxZ//x8Wf/8fFn//HxY//x8WP/8fFj//HxY//x8WP/8fFj//HxY9/t8WMT7fFgx+3xYAvt8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD7fFgA+3xYAvt8WCD7fFil+3xZ6/t8Wf37fFn/+3xZ//t8Wf/7fFn/+31Z//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+31Z//t8Wf/7fFn/+3xZ//t8Wf/7fFn/+3xZ//t8Wf/7fFn9+3xZ7ft8WK77fFgm+3xYAvt8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPt8WAD7fFgB+3xYC/t8WGf7fFjT+31Y8/t9WPz7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+3xY//t9WP/7fFj/+31Y//t8WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t8WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+31Y//t9WP/7fVj/+3xY//t9WP37fFj0+3xY1vt8WHD7fFgO+3xYAft8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+nxYAPp8WAD7fFgE+3xYHft8WHb7fFjM/H1Z7fx9WfX8fVn5/H1Z/Px9Wf38fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/vx9Wf78fVn+/H1Z/fx9Wfz8fVn5/H1Z9vx9We77fFjR+3xYfPt8WCH7fFgF+3xYAPt8WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+3xYAPt8WAH7fFgF+3xYD/t8WED7fFh7+3xYqPt8WMf7fFjZ/H1Z3/x9WeD8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/x9Wd/8fVnf/H1Z3/t8WNv7fFjK+3xYrPt8WH77fFhF+3xYEvt8WAb7fFgB+3xYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+ntXAPp7VwD7fFgD+3xYB/t8WAr7fFgM+3xYDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ38fVkN/H1ZDfx9WQ37fFgN+3xYDPt8WAr7fFgH+3xYBPt8WAH7fFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAH/8AAAAAAAAH/gAAAAAAAAP8AAAAAAAAAfgAAAAAAAAA8AAAAAAAAABwAAAAAAAAAGAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPB//+B/+AAA8H//4H/+AADwf//gf/8AAPB4AAAAH4AA8HgAAAAPgADweAAAAAeAAPB4AAAAB4AA8HgAAAAHgADweAAAAAeAAPB4AAAAB4AA8HwAAAAPAADwPgAAAD4AAPA//wAf/AAA8B//gB/8AADwB//AH/wAAPAAB+AAPgAA8AAD4AAPAADwAAHgAAeAAPAAAfAAB4AA8AAB8AAHgADwAAHwAAeAAPAAAeAAB4AA8AAD4AAPgADwAA/gAB8AAPB//8B//wAA8H//gH/+AADwf/4Af/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAACAAAAAAAAAAMAAAAAAAAABwAAAAAAAAAHgAAAAAAAAA/AAAAAAAAAH+AAAAAAAAA/8AAAAAAAAH/8AAAAAAAB//+AAAAAAA/8=
// @grant        none
// @tag          123 123云盘 云盘 批量重命名助手 123FastRename
// ==/UserScript==

(function () {
    'use strict';

    // 工具函数：解析文件名和扩展名
    function parseFileName(fileName) {
        if (!fileName || !fileName.includes('.')) return { name: fileName || '', ext: '' };
        const lastDot = fileName.lastIndexOf('.');
        return { name: fileName.substring(0, lastDot), ext: fileName.substring(lastDot) };
    }

    const CONSTANTS = {
        API_DELAY: 100,
        PAGE_SIZE: 100,
        PRIMARY_COLOR: '#2961D9',
        BORDER_COLOR: '#d9d9d9',
        TEXT_COLOR: '#919191',
        TEXT_COLOR_DARK: '#333',
        TEXT_COLOR_LIGHT: '#999',
        FILE_TYPE_FOLDER: 1,
        CATEGORY_VIDEO: '2',
        DEBUG_MODE: false
    };

    const logger = {
        log: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.log('[123FASTRENAME]', ...args);
            }
        },
        error: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.error('[123FASTRENAME]', ...args);
            }
        },
        warn: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.warn('[123FASTRENAME]', ...args);
            }
        }
    };

    const CSS_STYLES = `
        .separator {
            height: 1px;
            margin: 12px 0;
            border-bottom: 1px dashed #d9d9d9;
        }
        .sfr-button-container {
            position: relative;
            display: none;
        }

        .sfr-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }

        .sfr-modal-content {
            background: #fff;
            border-radius: 20px;
            width: 70vw;
            height: 80vh;
            display: flex;
            font-size: 14px;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .sfr-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sfr-modal-title-container {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 12px;
        }

        .sfr-modal-title {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }

        .sfr-modal-subtitle {
            margin: 0;
            font-size: 12px;
            color: #999;
        }

        .sfr-button-container-inner {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .sfr-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .sfr-file-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 100%;
            width: 100%;
            overflow-x: hidden;
        }

        .sfr-file-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            transition: background 0.2s, transform 0.2s;
            cursor: move;
            gap: 12px;
            border: 1px solid #d7d7d7;
        }

        .sfr-file-item:hover {
            background: #e8e8e8;
        }

        .sfr-file-item.dragging {
            opacity: 0.5;
            transform: scale(0.98);
        }

        .sfr-file-index {
            color: rgb(51, 51, 51);
            min-width: 30px;
            font-size: 14px;
        }

        .sfr-file-name {
            flex: 1;
            color: #333;
            word-break: break-all;
        }

        .sfr-file-size {
            color: #999;
            font-size: 12px;
        }

        .sfr-file-delete-btn {
            padding: 2px;
            width: 16px;
            height: 16px;
            border: none;
            background: #ff4d4f;
            color: #fff;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .sfr-file-delete-btn:hover {
            background: #f44336;
        }

        .sfr-file-item-rename {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            max-width: 100%;
            width: 100%;
        }

        .sfr-file-item-rename .sfr-file-name-original {
            flex: 1;
            color: #999;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #d7d7d7;
        }

        .sfr-file-item-rename .sfr-file-name-original span:last-child {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sfr-file-item-rename .sfr-file-index {
            color: #666;
            min-width: 30px;
            font-size: 14px;
            flex-shrink: 0;
        }

        .sfr-file-item-rename .sfr-arrow-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: #f44336;
            font-size: 18px;
            font-weight: 500;
        }

        .sfr-file-item-rename .sfr-file-name-new {
            flex: 1;
            color: #333;
            font-size: 14px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid #d7d7d7;
        }

        .sfr-modal-header-right {
            margin-left: auto;
            display: flex;
            align-items: center;
        }

        .sfr-tab-container {
            display: flex;
            gap: 4px;
            background: #f5f5f5;
            padding: 4px;
            border-radius: 8px;
        }

        .sfr-tab-item {
            padding: 6px 12px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            user-select: none;
        }

        .sfr-tab-item:hover {
            color: #2961D9;
        }

        .sfr-tab-item.active {
            background: #fff;
            color: #2961D9;
            font-weight: 500;
        }

        .sfr-modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #e8e8e8;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .sfr-rename-config {
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 12px;
            border: 1px solid #d7d7d7;
        }

        .sfr-rename-inputs-container {
            display: flex;
            gap: 12px;
        }

        .sfr-rename-config-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .sfr-rename-config-input:focus {
            border-color: #2961D9;
        }

        .sfr-checkbox-button {
            padding: 6px 10px;
            background: #fff;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            color: #666;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sfr-checkbox-button:hover,
        .sfr-checkbox-button[data-checked="true"] {
            border-color: #2961D9;
            color: #2961D9;
        }

        .sfr-checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            pointer-events: none;
        }

        .sfr-checkbox-span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .sfr-checkbox-input {
            cursor: pointer;
            pointer-events: none;
        }

        .sfr-checkbox-text {
            padding: 0;
            font-size: 13px;
            font-weight: 500;
            margin-left: 6px;
            color: #919191;
        }

        .sfr-checkbox-button[data-checked="true"] .sfr-checkbox-text {
            color: #2961D9;
        }

        .sfr-drag-handle {
            color: #999;
            cursor: move;
            font-size: 16px;
            user-select: none;
        }

        .sfr-stats-container {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 0;
            font-size: 13px;
            color: #666;
        }

        .sfr-stats-item {
            display: flex;
            align-items: center;
        }

        .sfr-stats-item strong {
            color: #2961D9;
            margin: 0 2px;
        }

        .sfr-modal-footer-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 16px;
        }

        .sfr-footer-buttons-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sfr-btn {
            padding: 4px 15px;
            height: 32px;
            font-size: 14px;
            border-radius: 6px;
            cursor: pointer;
            border: 1px solid #d9d9d9;
            background: #fff;
            color: rgba(0, 0, 0, 0.88);
            transition: all 0.2s;
        }

        .sfr-btn:hover {
            color: #2961D9;
            border-color: #2961D9;
        }

        .sfr-btn-primary {
            padding: 4px 15px;
            height: 32px;
            font-size: 14px;
            border-radius: 6px;
            cursor: pointer;
            border: 1px solid #2961D9;
            background: #2961D9;
            color: #fff;
            transition: all 0.2s;
        }

        .sfr-btn-primary:hover {
            background: #1d4bbf;
            border-color: #1d4bbf;
        }

        .sfr-btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = CSS_STYLES;
    document.head.appendChild(styleElement);

    // 1. 123云盘API通信类
    class PanApiClient {
        constructor() {
            this.host = 'https://' + window.location.host;
            this.authToken = localStorage['authorToken'] || '';
            this.loginUuid = localStorage['LoginUuid'] || '';
            this.appVersion = '3';
            this.referer = document.location.href;
            this._validateCredentials();
        }

        _validateCredentials() {
            if (!this.authToken || !this.loginUuid) {
                logger.warn('[PanApiClient]', '缺少认证信息，请先登录');
            }
        }

        buildURL(path, queryParams) {
            const queryString = new URLSearchParams(queryParams || {}).toString();
            return `${this.host}${path}?${queryString}`;
        }

        async sendRequest(method, path, queryParams, body) {
            const headers = {
                'Content-Type': 'application/json;charset=UTF-8',
                'Authorization': 'Bearer ' + this.authToken,
                'platform': 'web',
                'App-Version': this.appVersion,
                'LoginUuid': this.loginUuid,
                'Origin': this.host,
                'Referer': this.referer,
            };
            try {
                const response = await fetch(this.buildURL(path, queryParams), {
                    method, headers, body, credentials: 'include'
                });
                const data = await response.json();
                if (data.code !== 0) {
                    throw new Error(data.message || 'API请求失败');
                }
                await new Promise(resolve => setTimeout(resolve, CONSTANTS.API_DELAY));
                return data;
            } catch (e) {
                logger.error('[PanApiClient]', 'API请求失败:', e);
                throw e;
            }
        }

        async getOnePageFileList(parentFileId, page) {
            const urlParams = {
                driveId: '0',
                limit: '100',
                next: '0',
                orderBy: 'file_name',
                orderDirection: 'asc',
                parentFileId: parentFileId.toString(),
                trashed: 'false',
                SearchData: '',
                Page: page.toString(),
                OnlyLookAbnormalFile: '0',
                event: 'homeListFile',
                operateType: '1',
                inDirectSpace: 'false'
            };
            const data = await this.sendRequest("GET", "/b/api/file/list/new", urlParams);
            return { data: { InfoList: data.data.InfoList }, total: data.data.Total };
        }

        async getFileList(parentFileId) {
            let InfoList = [];
            const info = await this.getOnePageFileList(parentFileId, 1);
            InfoList.push(...info.data.InfoList);
            const total = info.total;
            if (total > 100) {
                const times = Math.ceil(total / 100);
                for (let i = 2; i < times + 1; i++) {
                    const info = await this.getOnePageFileList(parentFileId, i);
                    InfoList.push(...info.data.InfoList);
                }
            }
            return { data: { InfoList }, total: total };
        }

        async getFileInfo(idList) {
            const fileIdList = idList.map(fileId => ({ fileId }));
            const data = await this.sendRequest("POST", "/b/api/file/info", {}, JSON.stringify({ fileIdList }));
            return { data: { InfoList: data.data.infoList } };
        }

        async fileRename(fileInfo) {
            if (fileInfo.OriginalFileName === fileInfo.NewFileName) {
                return true;
            }

            const data = await this.sendRequest("POST", "/b/api/file/rename", {}, JSON.stringify({ 
                driveId: '0',
                duplicate: '1',
                fileId: Number(fileInfo.FileId), 
                fileName: fileInfo.NewFileName,
            }));

            return data.code === 0;
        }
    }

    // 2. 选中文件管理类
    class TableRowSelector {
        constructor() {
            this.selectedRowKeys = new Set();
            this.unselectedRowKeys = new Set();
            this.isSelectAll = false;
            this._inited = false;
            this._callbacks = [];
            this._observers = [];
            this._breadcrumbObserver = null;
        }

        init() {
            if (this._inited) return;
            this._inited = true;

            this._observeBreadcrumb();
            this._observeRowSelection();
        }

        _observeRowSelection() {
            const self = this;

            // 监听全选事件
            const selectAllClickHandler = (e) => {
                const checkbox = e.target.closest('.ant-checkbox-input[aria-label="Select all"]');
                if (!checkbox) return;
                // 延迟执行，等 DOM 更新完成后再读取状态
                setTimeout(() => {
                    if (checkbox.checked) {
                        self.isSelectAll = true;
                        self.unselectedRowKeys = new Set();
                        self.selectedRowKeys = new Set();
                    } else {
                        self.isSelectAll = false;
                        self.selectedRowKeys = new Set();
                        self.unselectedRowKeys = new Set();
                    }
                    self._notifyCallbacks();
                }, 0);
            };
            this._selectAllClickHandler = selectAllClickHandler;
            document.addEventListener('click', selectAllClickHandler);

            // 监听行的 class 变化，通过 ant-table-row-selected 推导选中状态
            let rowDebounceTimer = null;
            const pendingRowChanges = new Map(); // rowKey -> isSelected

            const processRowChanges = () => {
                for (const [rowKey, isSelected] of pendingRowChanges) {
                    if (self.isSelectAll) {
                        if (isSelected) {
                            self.unselectedRowKeys.delete(rowKey);
                        } else {
                            self.unselectedRowKeys.add(rowKey);
                        }
                    } else {
                        if (isSelected) {
                            self.selectedRowKeys.add(rowKey);
                        } else {
                            self.selectedRowKeys.delete(rowKey);
                        }
                    }
                }
                pendingRowChanges.clear();
                self._notifyCallbacks();
            };

            const rowObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
                    const target = mutation.target;
                    if (!target.classList || !target.classList.contains('ant-table-row')) continue;

                    const rowKey = target.getAttribute('data-row-key');
                    if (!rowKey) continue;

                    const isSelected = target.classList.contains('ant-table-row-selected');
                    pendingRowChanges.set(rowKey, isSelected);
                }

                if (pendingRowChanges.size > 0) {
                    if (rowDebounceTimer) clearTimeout(rowDebounceTimer);
                    rowDebounceTimer = setTimeout(processRowChanges, 50);
                }
            });

            const observeTarget = () => {
                const container = document.querySelector('.home-content');
                if (container) {
                    rowObserver.observe(container, {
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class']
                    });
                    self._observers.push(rowObserver);
                    logger.log('行选中监听已启动，目标: .home-content');
                } else {
                    setTimeout(observeTarget, 200);
                }
            };
            observeTarget();
        }

        _notifyCallbacks() {
            this._callbacks.forEach(callback => callback());
        }

        onSelectionChange(callback) {
            this._callbacks.push(callback);
        }

        getSelection() {
            return {
                isSelectAll: this.isSelectAll,
                selectedRowKeys: [...this.selectedRowKeys],
                unselectedRowKeys: [...this.unselectedRowKeys]
            };
        }

        destroy() {
            this._observers.forEach(observer => {
                observer.disconnect();
            });
            this._observers = [];
            if (this._selectAllClickHandler) {
                document.removeEventListener('click', this._selectAllClickHandler);
                this._selectAllClickHandler = null;
            }
            if (this._breadcrumbObserver) {
                this._breadcrumbObserver.disconnect();
                this._breadcrumbObserver = null;
            }
        }

        _observeBreadcrumb(retryCount = 0) {
            const MAX_RETRIES = 50;
            const breadcrumb = document.querySelector('.home-breadcrumb');
            if (!breadcrumb) {
                if (retryCount >= MAX_RETRIES) {
                    logger.warn('面包屑元素不存在，已达到最大重试次数');
                    return;
                }
                logger.log('面包屑元素不存在，延迟重试');
                setTimeout(() => this._observeBreadcrumb(retryCount + 1), 200);
                return;
            }

            this._breadcrumbObserver = new MutationObserver(() => {
                logger.log('检测到面包屑变化，清空所有选择');
                this.selectedRowKeys.clear();
                this.unselectedRowKeys.clear();
                this.isSelectAll = false;
                this._notifyCallbacks();
            });

            this._breadcrumbObserver.observe(breadcrumb, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
            logger.log('面包屑监听已启动');
        }
    }

    // 3. 选中文件管理类
    class SelectedFilesManager {
        constructor(apiClient, selector) {
            this.apiClient = apiClient;
            this.selector = selector;
            this.selectedFiles = [];
            this._callbacks = [];
            this._debounceTimer = null;
            this._cachedFileList = null;
            this._cachedParentFileId = null;
            this._isUpdating = false;
        }

        init() {
            this.selector.onSelectionChange(() => {
                logger.log('文件选择变化，开始防抖更新');
                this._debounceUpdate();
            });
        }

        _debounceUpdate() {
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }
            this._debounceTimer = setTimeout(() => {
                logger.log('防抖结束，开始更新选中文件');
                this._updateSelectedFiles();
            }, 300);
        }

        async _updateSelectedFiles() {
            logger.log('_updateSelectedFiles 开始执行，_isUpdating:', this._isUpdating);
            this._isUpdating = true;
            
            const selection = this.selector.getSelection();
            logger.log('当前选择状态:', selection);
            this.selectedFiles = [];

            const extractFileFields = (file) => ({
                FileId: file.FileId,
                FileName: file.FileName,
                Size: file.Size,
                Trashed: file.Trashed,
                Category: file.Category,
                Type: file.Type
            });

            if (selection.isSelectAll) {
                logger.log('全选模式');
                const parentFileId = await this._getParentFileId();
                logger.log('父级文件ID:', parentFileId);
                
                let allFiles;
                if (this._cachedFileList && this._cachedParentFileId === parentFileId) {
                    allFiles = this._cachedFileList;
                    logger.log('_updateSelectedFiles using cached file list');
                } else {
                    const fileList = await this.apiClient.getFileList(parentFileId);
                    allFiles = fileList.data.InfoList;
                    this._cachedFileList = allFiles;
                    this._cachedParentFileId = parentFileId;
                    logger.log('_updateSelectedFiles allFiles:', allFiles.length);
                }
                
                if (selection.unselectedRowKeys.length === 0) {
                    // 全选且没有取消的文件，直接使用所有文件
                    logger.log('全选且没有取消的文件');
                    this.selectedFiles = allFiles
                        .filter(file => file.Type !== CONSTANTS.FILE_TYPE_FOLDER)
                        .map(extractFileFields);
                    logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                } else {
                    // 全选但有取消的文件，过滤掉取消的文件
                    logger.log('全选但有取消的文件，取消数量:', selection.unselectedRowKeys.length);
                    this.selectedFiles = allFiles
                        .filter(file => {
                            const isUnselected = selection.unselectedRowKeys.includes(String(file.FileId));
                            const isFile = file.Type !== CONSTANTS.FILE_TYPE_FOLDER;
                            return !isUnselected && isFile;
                        })
                        .map(extractFileFields);
                    logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                }
            } else {
                // 非全选模式，清除缓存
                logger.log('非全选模式');
                this._cachedFileList = null;
                this._cachedParentFileId = null;
                
                // 非全选模式，使用 getFileInfo 获取选中的文件
                const fileIds = selection.selectedRowKeys;
                logger.log('_updateSelectedFiles fileIds:', fileIds.length, fileIds);
                
                if (fileIds.length > 0) {
                    try {
                        const fileInfoList = await this.apiClient.getFileInfo(fileIds);
                        this.selectedFiles = fileInfoList.data.InfoList
                            .filter(file => file.Type !== CONSTANTS.FILE_TYPE_FOLDER)
                            .map(extractFileFields);
                        logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                    } catch (e) {
                        logger.error('[SelectedFilesManager]', '获取文件信息失败:', e);
                    }
                }
            }

            this._notifyCallbacks();
            
            this._isUpdating = false;
            logger.log('_updateSelectedFiles 执行完成，最终选中文件数:', this.selectedFiles.length);
            
            return this.selectedFiles;
        }

        async _getParentFileId() {
            try {
                const homeFilePath = JSON.parse(sessionStorage['filePath'])['homeFilePath'];
                const parentFileId = (homeFilePath[homeFilePath.length - 1] || 0);
                return parentFileId.toString();
            } catch (e) {
                logger.error('[SelectedFilesManager]', '获取父级文件ID失败:', e);
                return '0';
            }
        }

        _notifyCallbacks() {
            this._callbacks.forEach(callback => callback());
        }

        onFilesChange(callback) {
            this._callbacks.push(callback);
        }

        isUpdating() {
            return this._isUpdating;
        }

        refresh() {
            return this._updateSelectedFiles();
        }

        getSelectedFiles() {
            return [...this.selectedFiles];
        }

        hasSelectedFiles() {
            return this.selectedFiles.length > 0;
        }
    }

    // 4. 模态框组件类
    class Modal {
        constructor(options = {}) {
            this.title = options.title || '';
            this.subtitle = options.subtitle || '';
            this.bodyContent = options.bodyContent || null;
            this.headerButtons = options.headerButtons || null;
            this.headerRight = options.headerRight || null;
            this.footerButtons = options.footerButtons || [];
            this.footerContent = options.footerContent || null;
            this.onClose = options.onClose || null;
            this.modal = null;
        }

        create() {
            const modal = document.createElement('div');
            modal.className = 'sfr-modal-overlay';

            const modalContent = document.createElement('div');
            modalContent.className = 'sfr-modal-content';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'sfr-modal-header';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'sfr-modal-title-container';

            const modalTitle = document.createElement('h3');
            modalTitle.textContent = this.title;
            modalTitle.className = 'sfr-modal-title';

            titleContainer.appendChild(modalTitle);

            if (this.subtitle) {
                const modalSubtitle = document.createElement('p');
                modalSubtitle.textContent = this.subtitle;
                modalSubtitle.className = 'sfr-modal-subtitle';
                titleContainer.appendChild(modalSubtitle);
            }

            modalHeader.appendChild(titleContainer);

            if (this.headerButtons) {
                modalHeader.appendChild(this.headerButtons);
            }

            if (this.headerRight) {
                modalHeader.appendChild(this.headerRight);
            }

            const modalBody = document.createElement('div');
            modalBody.className = 'sfr-modal-body';

            if (this.bodyContent) {
                modalBody.appendChild(this.bodyContent);
            }

            const modalFooter = document.createElement('div');
            modalFooter.className = 'sfr-modal-footer';

            if (this.footerContent) {
                modalFooter.appendChild(this.footerContent);
            } else {
                this.footerButtons.forEach(btn => {
                    modalFooter.appendChild(btn);
                });
            }

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);

            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.close();
                }
            };

            this.modal = modal;
            return modal;
        }

        show() {
            if (!this.modal) {
                this.create();
            }
            document.body.appendChild(this.modal);
        }

        close() {
            if (this.modal) {
                this.modal.remove();
                this.modal = null;
            }
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    // 5. UI管理类
    class UiManager {
        constructor(selectedFilesManager, selector, apiClient) {
            this.selectedFilesManager = selectedFilesManager;
            this.selector = selector;
            this.apiClient = apiClient;
            this.actionButton = null;
            this._observer = null;
            this._sortModal = null;
            this._renameModal = null;
            this._statsContainer = null;
        }

        init() {
            this.selector.init();
            this.selectedFilesManager.init();
            this.selectedFilesManager.onFilesChange(() => {
                this._updateActionButton();
            });
            this._waitForContainerAndCreateButton();
        }

        _waitForContainerAndCreateButton() {
            const checkAndCreate = () => {
                const container = document.querySelector('.home-operator-button-group');
                if (container) {
                    this._createActionButton();
                    if (this._observer) {
                        this._observer.disconnect();
                        this._observer = null;
                    }
                }
            };

            checkAndCreate();

            if (!this.actionButton) {
                this._observer = new MutationObserver(() => {
                    checkAndCreate();
                });
                this._observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }

        _createActionButton() {
            logger.log('开始创建批量重命名按钮');
            const buttonExist = document.querySelector('.sfr-button-container');
            if (buttonExist) {
                logger.log('按钮已存在，复用现有按钮');
                this.actionButton = buttonExist;
                return;
            }

            const container = document.querySelector('.home-operator-button-group');
            if (!container) {
                logger.log('未找到按钮容器，延迟重试');
                return;
            }

            const firstButton = container.querySelector('button');
            const buttonClass = firstButton ? firstButton.className : 'sfr-btn-primary';

            const btnContainer = document.createElement('div');
            btnContainer.className = 'sfr-button-container';

            const btn = document.createElement('button');
            btn.className = buttonClass;
            btn.innerHTML = `<span>批量重命名</span>`;

            btn.addEventListener('click', () => {
                this._handleButtonClick();
            });

            btnContainer.appendChild(btn);

            container.insertBefore(btnContainer, container.firstChild);

            this.actionButton = btnContainer;
            logger.log('批量重命名按钮创建完成');
        }

        _updateActionButton() {
            if (!this.actionButton) {
                return;
            }

            const hasFiles = this.selectedFilesManager.hasSelectedFiles();
            if (hasFiles) {
                this.actionButton.style.display = 'inline-block';
            } else {
                this.actionButton.style.display = 'none';
            }
        }

        _handleButtonClick() {
            if (this.selectedFilesManager.isUpdating()) {
                return;
            }
            
            this.selectedFilesManager.refresh().then(() => {
                const selectedFiles = this.selectedFilesManager.getSelectedFiles();
                this._showFileListModal(selectedFiles);
            });
        }

        _createCheckboxButton(text, defaultChecked = false, onChange = null) {
            const button = document.createElement('button');
            button.className = 'sfr-checkbox-button';
            button.dataset.checked = defaultChecked.toString();

            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'ant-checkbox-wrapper sfr-checkbox-label';

            const checkboxSpan = document.createElement('span');
            checkboxSpan.className = 'ant-checkbox ant-wave-target sfr-checkbox-span';

            const checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.className = 'ant-checkbox-input sfr-checkbox-input';
            checkboxInput.checked = defaultChecked;

            const checkboxLabelText = document.createElement('span');
            checkboxLabelText.textContent = text;
            checkboxLabelText.className = 'sfr-checkbox-text';

            checkboxSpan.appendChild(checkboxInput);
            checkboxLabel.appendChild(checkboxSpan);
            checkboxLabel.appendChild(checkboxLabelText);
            button.appendChild(checkboxLabel);

            if (defaultChecked) {
                checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                checkboxSpan.classList.add('ant-checkbox-checked');
            }

            button.onclick = () => {
                const isChecked = button.dataset.checked === 'true';
                const newState = !isChecked;
                button.dataset.checked = newState.toString();
                checkboxInput.checked = newState;
                
                if (newState) {
                    checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                    checkboxSpan.classList.add('ant-checkbox-checked');
                } else {
                    checkboxLabel.classList.remove('ant-checkbox-wrapper-checked');
                    checkboxSpan.classList.remove('ant-checkbox-checked');
                }

                if (onChange && typeof onChange === 'function') {
                    onChange(newState);
                }
            };

            return {
                button,
                checkboxLabel,
                checkboxSpan,
                checkboxInput,
                checkboxLabelText,
                setChecked: (checked) => {
                    button.dataset.checked = checked.toString();
                    checkboxInput.checked = checked;
                    if (checked) {
                        checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                        checkboxSpan.classList.add('ant-checkbox-checked');
                    } else {
                        checkboxLabel.classList.remove('ant-checkbox-wrapper-checked');
                        checkboxSpan.classList.remove('ant-checkbox-checked');
                    }
                },
                isChecked: () => button.dataset.checked === 'true'
            };
        }

        _showFileListModal(files) {
            const fileList = document.createElement('div');
            fileList.className = 'sfr-file-list';

            let draggedItem = null;
            const fragment = document.createDocumentFragment();

            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'sfr-file-item';
                fileItem.dataset.fileId = file.FileId;
                fileItem.dataset.category = file.Category || '0';
                fileItem.draggable = true;

                fileItem.addEventListener('dragstart', (e) => {
                    draggedItem = fileItem;
                    fileItem.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', file.FileId);
                });

                fileItem.addEventListener('dragend', () => {
                    draggedItem = null;
                    fileItem.classList.remove('dragging');
                    
                    const allItems = fileList.querySelectorAll('.sfr-file-item');
                    allItems.forEach(item => {
                        item.style.transform = '';
                    });
                    
                    this._updateFileIndices(fileList);
                });

                fileItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (draggedItem && draggedItem !== fileItem) {
                        const rect = fileItem.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        if (e.clientY < midY) {
                            fileList.insertBefore(draggedItem, fileItem);
                        } else {
                            fileList.insertBefore(draggedItem, fileItem.nextSibling);
                        }
                    }
                });

                fileItem.addEventListener('dragenter', (e) => {
                    e.preventDefault();
                    if (draggedItem && draggedItem !== fileItem) {
                        fileItem.style.transform = 'translateY(4px)';
                    }
                });

                fileItem.addEventListener('dragleave', () => {
                    if (draggedItem && draggedItem !== fileItem) {
                        fileItem.style.transform = '';
                    }
                });

                fileItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    fileItem.style.transform = '';
                });

                const dragHandle = document.createElement('span');
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.className = 'sfr-drag-handle';

                const fileIndex = document.createElement('span');
                fileIndex.textContent = `${index + 1}.`;
                fileIndex.className = 'sfr-file-index';

                const fileName = document.createElement('span');
                fileName.textContent = file.FileName;
                fileName.className = 'sfr-file-name';

                const fileSize = document.createElement('span');
                fileSize.textContent = this._formatFileSize(file.Size);
                fileSize.className = 'sfr-file-size';

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '×';
                deleteBtn.className = 'sfr-file-delete-btn';

                deleteBtn.onmousedown = (e) => {
                    e.stopPropagation();
                };
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    fileItem.remove();
                    this._updateFileIndices(fileList);
                    if (this._statsContainer) {
                        this._updateStats(fileList, files, this._statsContainer);
                    }
                };

                fileItem.appendChild(dragHandle);
                fileItem.appendChild(fileIndex);
                fileItem.appendChild(fileName);
                fileItem.appendChild(fileSize);
                fileItem.appendChild(deleteBtn);
                fragment.appendChild(fileItem);
            });

            fileList.appendChild(fragment);

            const sortButtonObj = this._createCheckboxButton('文件名降序', false, (isChecked) => {
                const fileItems = Array.from(fileList.querySelectorAll('.sfr-file-item'));
                fileItems.sort((a, b) => {
                    const nameA = a.querySelector('span:nth-child(3)').textContent;
                    const nameB = b.querySelector('span:nth-child(3)').textContent;
                    if (isChecked) {
                        return nameB.localeCompare(nameA, 'zh-CN');
                    } else {
                        return nameA.localeCompare(nameB, 'zh-CN');
                    }
                });
                
                fileItems.forEach(item => {
                    fileList.appendChild(item);
                });
                
                this._updateFileIndices(fileList);
            });

            const filterButtonObj = this._createCheckboxButton('过滤视频文件', true, (isChecked) => {
                const fileItems = fileList.querySelectorAll('.sfr-file-item');
                fileItems.forEach(item => {
                    const category = item.dataset.category;
                    if (isChecked && category !== CONSTANTS.CATEGORY_VIDEO) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'flex';
                    }
                });
                this._updateFileIndices(fileList);
                this._updateStats(fileList, files, statsContainer);
            });

            const headerButtonsContainer = document.createElement('div');
            headerButtonsContainer.className = 'sfr-button-container-inner';
            headerButtonsContainer.appendChild(sortButtonObj.button);
            headerButtonsContainer.appendChild(filterButtonObj.button);

            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            fileItems.forEach(item => {
                const category = item.dataset.category;
                if (category !== CONSTANTS.CATEGORY_VIDEO) {
                    item.style.display = 'none';
                }
            });
            this._updateFileIndices(fileList);

            const statsContainer = document.createElement('div');
            statsContainer.className = 'sfr-stats-container';
            this._statsContainer = statsContainer;

            this._updateStats(fileList, files, statsContainer);

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '下一步';
            nextBtn.className = 'sfr-btn-primary';
            nextBtn.onclick = () => {
                const orderedFiles = this._getOrderedFiles(fileList, files);
                logger.log('排序后的文件列表:', orderedFiles);
                this._sortModal.close();
                this._showRenameModal(orderedFiles);
            };

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '取消';
            closeBtn.className = 'sfr-btn';
            closeBtn.onclick = () => this._sortModal.close();

            const footerButtonsContainer = document.createElement('div');
            footerButtonsContainer.className = 'sfr-footer-buttons-container';
            footerButtonsContainer.appendChild(closeBtn);
            footerButtonsContainer.appendChild(nextBtn);

            const footerContent = document.createElement('div');
            footerContent.className = 'sfr-modal-footer-content';
            footerContent.appendChild(statsContainer);
            footerContent.appendChild(footerButtonsContainer);

            this._sortModal = new Modal({
                title: '文件排序',
                subtitle: '文件已自动排序，如顺序不对，请手动拖动排序，然后点击下一步',
                bodyContent: fileList,
                headerButtons: headerButtonsContainer,
                footerContent: footerContent
            });

            this._sortModal.show();
        }

        _showRenameModal(files) {
            const bodyContainer = document.createElement('div');
            bodyContainer.className = 'sfr-modal-body-container';

            const configArea = document.createElement('div');
            configArea.className = 'sfr-rename-config';

            const separator = document.createElement('div');
            separator.className = 'separator';

            const fileList = document.createElement('div');
            fileList.className = 'sfr-file-list';

            const fragment = document.createDocumentFragment();

            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'sfr-file-item-rename';
                fileItem.dataset.fileId = file.FileId;
                fileItem.dataset.originalIndex = index;
                fileItem.dataset.originalFileName = file.FileName;

                const originalName = document.createElement('div');
                originalName.className = 'sfr-file-name-original';

                const fileIndex = document.createElement('span');
                fileIndex.textContent = `${index + 1}.`;
                fileIndex.className = 'sfr-file-index';

                const fileName = document.createElement('span');
                fileName.textContent = file.FileName;

                originalName.appendChild(fileIndex);
                originalName.appendChild(fileName);

                const arrowIcon = document.createElement('div');
                arrowIcon.className = 'sfr-arrow-icon';
                arrowIcon.innerHTML = '→';

                const newName = document.createElement('div');
                newName.className = 'sfr-file-name-new';
                newName.textContent = file.FileName;

                fileItem.appendChild(originalName);
                fileItem.appendChild(arrowIcon);
                fileItem.appendChild(newName);
                fragment.appendChild(fileItem);
            });

            fileList.appendChild(fragment);

            bodyContainer.appendChild(configArea);
            bodyContainer.appendChild(separator);
            bodyContainer.appendChild(fileList);

            const tabContainer = document.createElement('div');
            tabContainer.className = 'sfr-tab-container';

            const tabs = [
                { id: 'sequence', name: '按序号重命名' },
                { id: 'append', name: '追加重命名' },
                { id: 'findReplace', name: '查找替换' },
                { id: 'regex', name: '正则替换' },
                { id: 'format', name: '格式替换' }
            ];

            tabs.forEach((tab, index) => {
                const tabItem = document.createElement('div');
                tabItem.className = 'sfr-tab-item' + (index === 0 ? ' active' : '');
                tabItem.dataset.tabId = tab.id;
                tabItem.textContent = tab.name;

                tabItem.onclick = () => {
                    tabContainer.querySelectorAll('.sfr-tab-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    tabItem.classList.add('active');
                    logger.log('切换到模式:', tab.id);
                    this._updateConfigArea(tab.id, configArea, fileList);
                };

                tabContainer.appendChild(tabItem);
            });

            const headerRight = document.createElement('div');
            headerRight.className = 'sfr-modal-header-right';
            headerRight.appendChild(tabContainer);

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.className = 'sfr-btn-primary';
            let hasExecuted = false;
            confirmBtn.onclick = async () => {
                if (hasExecuted) {
                    logger.log('重命名已完成，关闭弹窗并刷新页面');
                    this._renameModal.close();
                    window.location.reload();
                    return;
                }
                
                logger.log('开始执行重命名');
                prevBtn.style.display = 'none';
                
                const inputs = configArea.querySelectorAll('input');
                inputs.forEach(input => {
                    input.disabled = true;
                });
                
                const renamedFiles = [];
                const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                logger.log('待重命名文件数量:', fileItems.length);
                fileItems.forEach(item => {
                    const fileId = item.dataset.fileId;
                    const originalFileName = item.dataset.originalFileName;
                    const newNameElement = item.querySelector('.sfr-file-name-new');
                    const newFileName = newNameElement ? newNameElement.textContent : originalFileName;
                    renamedFiles.push({
                        FileId: fileId,
                        OriginalFileName: originalFileName,
                        NewFileName: newFileName
                    });
                });
                logger.log('待重命名文件列表:', renamedFiles);
                
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '重命名中...';
                    
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const fileInfo of renamedFiles) {
                        logger.log('正在重命名文件:', fileInfo.FileId, fileInfo.OriginalFileName, '->', fileInfo.NewFileName);
                        const result = await this.apiClient.fileRename(fileInfo);
                        logger.log('重命名结果:', fileInfo.FileId, result);
                        
                        const fileItem = fileList.querySelector(`.sfr-file-item-rename[data-file-id="${fileInfo.FileId}"]`);
                        if (fileItem) {
                            const newNameElement = fileItem.querySelector('.sfr-file-name-new');
                            if (newNameElement) {
                                if (result === true) {
                                    newNameElement.style.backgroundColor = '#dfffcc';
                                    newNameElement.style.border = '1px solid #84d75b';
                                    if (fileInfo.OriginalFileName !== fileInfo.NewFileName) {
                                        successCount++;
                                    }
                                } else {
                                    newNameElement.style.backgroundColor = '#ffc4c4';
                                    newNameElement.style.border = '1px solid #d75b5b';
                                    failCount++;
                                }
                            }
                            fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                    
                    logger.log('重命名完成，成功:', successCount, '失败:', failCount);
                    this._updateRenameStats(statsContainer, renamedFiles.length, successCount, failCount);
                    
                    hasExecuted = true;
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '关闭';
                } catch (error) {
                    logger.error('重命名失败:', error);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '确定';
                    
                    const inputs = configArea.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.disabled = false;
                    });
                }
            };

            const prevBtn = document.createElement('button');
            prevBtn.textContent = '上一步';
            prevBtn.className = 'sfr-btn';
            prevBtn.onclick = () => {
                this._renameModal.close();
                this._sortModal.show();
            };

            const statsContainer = document.createElement('div');
            statsContainer.className = 'sfr-stats-container';
            this._updateStats(fileList, files, statsContainer);

            const footerButtonsContainer = document.createElement('div');
            footerButtonsContainer.className = 'sfr-footer-buttons-container';
            footerButtonsContainer.appendChild(prevBtn);
            footerButtonsContainer.appendChild(confirmBtn);

            const footerContent = document.createElement('div');
            footerContent.className = 'sfr-modal-footer-content';
            footerContent.appendChild(statsContainer);
            footerContent.appendChild(footerButtonsContainer);

            this._renameModal = new Modal({
                title: '批量重命名',
                bodyContent: bodyContainer,
                headerRight: headerRight,
                footerContent: footerContent
            });

            this._renameModal.show();

            this._updateConfigArea('sequence', configArea, fileList);
        }

        _updateConfigArea(tabId, configArea, fileList) {
            configArea.innerHTML = '';

            if (tabId === 'sequence') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const prefixInput = document.createElement('input');
                prefixInput.type = 'text';
                prefixInput.className = 'sfr-rename-config-input';
                prefixInput.placeholder = '追加前缀';
                prefixInput.id = 'sfr-sequence-prefix';

                const numberInput = document.createElement('input');
                numberInput.type = 'number';
                numberInput.className = 'sfr-rename-config-input';
                numberInput.placeholder = '默认序号';
                numberInput.id = 'sfr-sequence-number';

                const suffixInput = document.createElement('input');
                suffixInput.type = 'text';
                suffixInput.className = 'sfr-rename-config-input';
                suffixInput.placeholder = '追加后缀';
                suffixInput.id = 'sfr-sequence-suffix';

                inputsContainer.appendChild(prefixInput);
                inputsContainer.appendChild(numberInput);
                inputsContainer.appendChild(suffixInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const prefix = prefixInput.value || '';
                    const startNumberStr = numberInput.value;
                    const suffix = suffixInput.value || '';

                    let startNumber = 1;
                    let paddingLength = 0;

                    if (startNumberStr) {
                        const parsedNumber = parseInt(startNumberStr);
                        if (parsedNumber === 0) {
                            paddingLength = startNumberStr.length;
                            startNumber = 1;
                        } else {
                            startNumber = parsedNumber;
                            paddingLength = startNumberStr.length;
                        }
                    }

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalIndex = parseInt(item.dataset.originalIndex);
                        const originalFileName = item.dataset.originalFileName;
                        const { ext } = parseFileName(originalFileName);
                        const sequenceNumber = startNumber + originalIndex;
                        let numberPart;
                        if (paddingLength > 0) {
                            numberPart = sequenceNumber.toString().padStart(paddingLength, '0');
                        } else {
                            numberPart = sequenceNumber.toString();
                        }
                        const newName = prefix + numberPart + suffix + ext;
                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                prefixInput.addEventListener('input', updateFileNames);
                numberInput.addEventListener('input', updateFileNames);
                suffixInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'append') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const prefixInput = document.createElement('input');
                prefixInput.type = 'text';
                prefixInput.className = 'sfr-rename-config-input';
                prefixInput.placeholder = '追加前缀';
                prefixInput.id = 'sfr-append-prefix';

                const suffixInput = document.createElement('input');
                suffixInput.type = 'text';
                suffixInput.className = 'sfr-rename-config-input';
                suffixInput.placeholder = '追加后缀';
                suffixInput.id = 'sfr-append-suffix';

                inputsContainer.appendChild(prefixInput);
                inputsContainer.appendChild(suffixInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const prefix = prefixInput.value || '';
                    const suffix = suffixInput.value || '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        const { name: nameWithoutExt, ext } = parseFileName(originalFileName);
                        const newName = prefix + nameWithoutExt + suffix + ext;
                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                prefixInput.addEventListener('input', updateFileNames);
                suffixInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'findReplace') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const findInput = document.createElement('input');
                findInput.type = 'text';
                findInput.className = 'sfr-rename-config-input';
                findInput.placeholder = '查找内容';
                findInput.id = 'sfr-find-content';

                const replaceInput = document.createElement('input');
                replaceInput.type = 'text';
                replaceInput.className = 'sfr-rename-config-input';
                replaceInput.placeholder = '替换内容';
                replaceInput.id = 'sfr-replace-content';

                const ignoreCaseLabel = document.createElement('label');
                ignoreCaseLabel.className = 'sfr-checkbox-button';

                const ignoreCaseCheckbox = document.createElement('input');
                ignoreCaseCheckbox.type = 'checkbox';
                ignoreCaseCheckbox.id = 'sfr-ignore-case';

                const ignoreCaseText = document.createElement('span');
                ignoreCaseText.textContent = '忽略大小写';

                ignoreCaseLabel.appendChild(ignoreCaseCheckbox);
                ignoreCaseLabel.appendChild(ignoreCaseText);

                inputsContainer.appendChild(findInput);
                inputsContainer.appendChild(replaceInput);
                inputsContainer.appendChild(ignoreCaseLabel);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const findText = findInput.value || '';
                    const replaceText = replaceInput.value || '';
                    const ignoreCase = ignoreCaseCheckbox.checked;

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (findText) {
                            if (ignoreCase) {
                                const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                                newName = originalFileName.replace(regex, replaceText);
                            } else {
                                newName = originalFileName.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replaceText);
                            }
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                findInput.addEventListener('input', updateFileNames);
                replaceInput.addEventListener('input', updateFileNames);
                ignoreCaseCheckbox.addEventListener('change', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'regex') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const regexInput = document.createElement('input');
                regexInput.type = 'text';
                regexInput.className = 'sfr-rename-config-input';
                regexInput.placeholder = '正则表达式';
                regexInput.id = 'sfr-regex-pattern';

                const replaceInput = document.createElement('input');
                replaceInput.type = 'text';
                replaceInput.className = 'sfr-rename-config-input';
                replaceInput.placeholder = '替换内容';
                replaceInput.id = 'sfr-regex-replace';

                inputsContainer.appendChild(regexInput);
                inputsContainer.appendChild(replaceInput);

                const regexErrorHint = document.createElement('span');
                regexErrorHint.style.cssText = 'color: #ff4d4f; font-size: 12px; display: none; margin-top: 4px;';
                inputsContainer.appendChild(regexErrorHint);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const regexPattern = regexInput.value || '';
                    const replaceText = replaceInput.value || '';

                    // 清除之前的错误状态
                    regexInput.style.borderColor = '';
                    regexErrorHint.style.display = 'none';
                    regexErrorHint.textContent = '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (regexPattern) {
                            try {
                                const regex = new RegExp(regexPattern, 'g');
                                newName = originalFileName.replace(regex, replaceText);
                            } catch {
                                newName = originalFileName;
                                regexInput.style.borderColor = '#ff4d4f';
                                regexErrorHint.textContent = '正则表达式语法错误';
                                regexErrorHint.style.display = 'inline';
                            }
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                regexInput.addEventListener('input', updateFileNames);
                replaceInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'format') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const formatInput = document.createElement('input');
                formatInput.type = 'text';
                formatInput.className = 'sfr-rename-config-input';
                formatInput.placeholder = '新格式名';
                formatInput.id = 'sfr-format-ext';

                inputsContainer.appendChild(formatInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const newExt = formatInput.value || '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (newExt) {
                            const { name: nameWithoutExt } = parseFileName(originalFileName);
                            let finalExt = newExt;
                            if (!finalExt.startsWith('.')) {
                                finalExt = '.' + finalExt;
                            }
                            newName = nameWithoutExt + finalExt;
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                formatInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            }
        }

        _updateFileIndices(fileList) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            let visibleIndex = 1;
            fileItems.forEach(item => {
                if (item.style.display !== 'none') {
                    const indexSpan = item.querySelector('.sfr-file-index');
                    if (indexSpan) {
                        indexSpan.textContent = `${visibleIndex}.`;
                    }
                    visibleIndex++;
                }
            });
        }

        _updateStats(fileList, files, statsContainer) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            const renameFileItems = fileList.querySelectorAll('.sfr-file-item-rename');
            const visibleFileItems = fileItems.length > 0 
                ? Array.from(fileItems).filter(item => item.style.display !== 'none')
                : Array.from(renameFileItems);
            const totalFiles = visibleFileItems.length;

            const fileCountSpan = document.createElement('span');
            fileCountSpan.className = 'sfr-stats-item';
            fileCountSpan.innerHTML = `共 <strong>${totalFiles}</strong> 个文件`;

            statsContainer.innerHTML = '';
            statsContainer.appendChild(fileCountSpan);
        }

        _updateRenameStats(statsContainer, totalFiles, successCount, failCount) {
            const skippedCount = totalFiles - successCount - failCount;

            const totalCountSpan = document.createElement('span');
            totalCountSpan.className = 'sfr-stats-item';
            totalCountSpan.innerHTML = `共 <strong>${totalFiles}</strong> 个文件`;

            const successSpan = document.createElement('span');
            successSpan.className = 'sfr-stats-item';
            successSpan.innerHTML = `成功 <strong style="color: #52c41a;">${successCount}</strong>`;

            const failSpan = document.createElement('span');
            failSpan.className = 'sfr-stats-item';
            failSpan.innerHTML = `失败 <strong style="color: #ff4d4f;">${failCount}</strong>`;

            statsContainer.innerHTML = '';
            statsContainer.appendChild(totalCountSpan);
            statsContainer.appendChild(successSpan);
            statsContainer.appendChild(failSpan);

            if (skippedCount > 0) {
                const skippedSpan = document.createElement('span');
                skippedSpan.className = 'sfr-stats-item';
                skippedSpan.innerHTML = `跳过 <strong>${skippedCount}</strong>`;
                statsContainer.appendChild(skippedSpan);
            }
        }

        _getOrderedFiles(fileList, originalFiles) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            const orderedFiles = [];
            const fileMap = new Map(originalFiles.map(f => [String(f.FileId), f]));

            fileItems.forEach((item) => {
                const fileId = item.dataset.fileId;
                const isVisible = item.style.display !== 'none';
                if (isVisible) {
                    const file = fileMap.get(String(fileId));
                    if (file) {
                        orderedFiles.push(file);
                    } else {
                        logger.warn('未找到文件信息:', fileId);
                    }
                }
            });

            return orderedFiles;
        }

        _formatFileSize(bytes) {
            if (!bytes || bytes <= 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    }

    const apiClient = new PanApiClient();
    const selector = new TableRowSelector();
    const selectedFilesManager = new SelectedFilesManager(apiClient, selector);
    const uiManager = new UiManager(selectedFilesManager, selector, apiClient);

    uiManager.init();

})();
