import { LitElement, html, svg, css } from "lit";
import { ref } from "lit/directives/ref.js";
import type * as FRAGS from "@thatopen/fragments";

export interface GanttTask {
  id: string;
  name: string;
  color: string;
  startDate: Date;
  endDate: Date;
  query: FRAGS.ItemsQueryParams[];
  /** Optional fallback category regex for procedural Three.js twins */
  categoryPattern?: string;
  /** Optional storey name for procedural Three.js twins */
  storeyName?: string;
  /** Optional element count badge */
  elementCount?: number;
}

const LABEL_W = 190;
const ROW_H = 34;
const HEADER_H = 30;
const BAR_H = 20;
const BAR_R = 4;
const BAR_Y_PAD = (ROW_H - BAR_H) / 2;
const HANDLE_SIZE = 7;

export class GanttChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      user-select: none;
    }
    .wrapper {
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: auto;
      box-sizing: border-box;
    }
    svg {
      display: block;
    }
  `;

  static properties = {
    tasks: { attribute: false },
    playheadRatio: { type: Number },
    activeTaskId: { type: String },
    _w: { state: true },
  };

  declare tasks: GanttTask[];
  declare playheadRatio: number;
  declare activeTaskId: string | null;
  declare private _w: number;

  private _ro: ResizeObserver | null = null;

  constructor() {
    super();
    this.tasks = [];
    this.playheadRatio = 0;
    this.activeTaskId = null;
    this._w = 600;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  private _onRef = (el?: Element) => {
    if (!el) return;
    this._w = Math.max(320, (el as HTMLElement).clientWidth);
    this._ro?.disconnect();
    this._ro = new ResizeObserver(([entry]) => {
      this._w = Math.max(320, entry.contentRect.width);
    });
    this._ro.observe(el);
  };

  private get _start(): Date {
    if (!this.tasks.length) return new Date();
    return new Date(Math.min(...this.tasks.map((t) => t.startDate.getTime())));
  }

  private get _end(): Date {
    if (!this.tasks.length) {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return d;
    }
    return new Date(Math.max(...this.tasks.map((t) => t.endDate.getTime())));
  }

  private get _span(): number {
    return Math.max(1, this._end.getTime() - this._start.getTime());
  }

  private _x(date: Date, tlW: number): number {
    return LABEL_W + ((date.getTime() - this._start.getTime()) / this._span) * tlW;
  }

  private _updatePlayheadFromClientX(clientX: number) {
    const svgEl = this.shadowRoot?.querySelector("svg");
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const tlW = Math.max(1, this._w - LABEL_W);
    const offsetX = clientX - rect.left - LABEL_W;
    const ratio = Math.max(0, Math.min(1, offsetX / tlW));
    this.playheadRatio = ratio;

    const date = new Date(this._start.getTime() + ratio * this._span);
    this.dispatchEvent(
      new CustomEvent<{ date: Date; ratio: number }>("playheadchange", {
        detail: { date, ratio },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onPlayheadMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this._updatePlayheadFromClientX(e.clientX);

    const onMove = (ev: MouseEvent) => {
      this._updatePlayheadFromClientX(ev.clientX);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  private _onHeaderClick = (e: MouseEvent) => {
    const svgEl = this.shadowRoot?.querySelector("svg");
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (e.clientX - rect.left < LABEL_W) return;
    this._updatePlayheadFromClientX(e.clientX);
  };

  private _monthTicks(tlW: number, totalH: number) {
    const marks: unknown[] = [];
    const cursor = new Date(this._start.getFullYear(), this._start.getMonth(), 1);
    let safety = 0;

    while (cursor.getTime() <= this._end.getTime() && safety < 60) {
      safety++;
      const x = this._x(cursor, tlW);
      if (x >= LABEL_W - 2 && x <= LABEL_W + tlW + 2) {
        const label = cursor.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });

        marks.push(svg`
          <line x1=${x} y1="0" x2=${x} y2=${totalH}
                stroke="rgba(255,255,255,0.08)" stroke-width="1" />
          <text x=${x + 6} y=${HEADER_H / 2 + 4}
                fill="rgba(255,255,255,0.45)"
                font-size="11" font-family="sans-serif">
            ${label}
          </text>
        `);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return marks;
  }

  private _taskRows(tlW: number) {
    const currentMs = this._start.getTime() + this.playheadRatio * this._span;

    return this.tasks.map((task, i) => {
      const rowY = HEADER_H + i * ROW_H;
      const x0 = this._x(task.startDate, tlW);
      const x1 = this._x(task.endDate, tlW);
      const bw = Math.max(6, x1 - x0);
      const by = rowY + BAR_Y_PAD;
      const isSelected = this.activeTaskId === task.id;
      const isBuilt = currentMs >= task.startDate.getTime() && this.playheadRatio > 0;
      const displayLabel =
        task.name.length > 23 ? `${task.name.slice(0, 21)}…` : task.name;

      return svg`
        <g style="cursor:pointer" @click=${() => this._emitTaskClick(task)}>
          <rect x="0" y=${rowY}
                width=${LABEL_W + tlW} height=${ROW_H}
                fill=${isSelected
                  ? "rgba(56, 189, 248, 0.12)"
                  : i % 2 === 0
                  ? "rgba(255,255,255,0.025)"
                  : "transparent"} />

          <circle cx="14" cy=${rowY + ROW_H / 2} r="4"
                  fill=${task.color}
                  opacity=${isBuilt || isSelected ? "1" : "0.45"} />

          <text x=${LABEL_W - 10} y=${rowY + ROW_H / 2}
                fill=${isSelected ? "#f8fafc" : "rgba(255,255,255,0.75)"}
                font-size="11.5" font-family="sans-serif" font-weight=${isSelected ? "700" : "500"}
                text-anchor="end" dominant-baseline="middle">
            ${displayLabel}
          </text>

          <rect x=${x0} y=${by} width=${bw} height=${BAR_H}
                rx=${BAR_R} ry=${BAR_R}
                fill=${task.color}
                opacity=${isBuilt || isSelected ? "0.95" : "0.55"}
                stroke=${isSelected ? "#ffffff" : "rgba(255,255,255,0.18)"}
                stroke-width=${isSelected ? "1.6" : "0.75"} />

          ${bw > 64
            ? svg`
              <text x=${x0 + bw / 2} y=${by + BAR_H / 2}
                    fill="rgba(255,255,255,0.95)"
                    font-size="10.5" font-family="sans-serif" font-weight="600"
                    text-anchor="middle" dominant-baseline="middle"
                    pointer-events="none">
                ${task.elementCount !== undefined ? `${task.elementCount} el` : task.name}
              </text>`
            : ""}
        </g>
      `;
    });
  }

  private _renderPlayhead(tlW: number, svgH: number) {
    const px = LABEL_W + this.playheadRatio * tlW;

    const handlePoints = `
      ${px - HANDLE_SIZE},2
      ${px + HANDLE_SIZE},2
      ${px},${HEADER_H - 4}
    `;

    return svg`
      <g @mousedown=${this._onPlayheadMouseDown} style="cursor:ew-resize">
        <rect x=${px - 9} y="0" width="18" height=${svgH}
              fill="transparent" />
        <line x1=${px} y1="0" x2=${px} y2=${svgH}
              stroke="#ef4444" stroke-width="2"
              pointer-events="none" />
        <polygon points=${handlePoints}
                 fill="#ef4444" stroke="#ffffff" stroke-width="0.8"
                 pointer-events="none" />
      </g>
    `;
  }

  private _emitTaskClick(task: GanttTask) {
    this.dispatchEvent(
      new CustomEvent<{ task: GanttTask }>("taskclick", {
        detail: { task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const tlW = Math.max(100, this._w - LABEL_W);
    const svgH = HEADER_H + Math.max(1, this.tasks.length) * ROW_H;

    return html`
      <div class="wrapper" ${ref(this._onRef)}>
        <svg width=${LABEL_W + tlW} height=${svgH}>
          <rect x="0" y="0" width=${LABEL_W + tlW} height=${HEADER_H}
                fill="rgba(255,255,255,0.04)"
                style="cursor:pointer"
                @mousedown=${this._onHeaderClick} />

          <text x=${LABEL_W / 2} y=${HEADER_H / 2 + 4}
                fill="rgba(255,255,255,0.45)"
                font-size="10" font-family="sans-serif" font-weight="700"
                text-anchor="middle" letter-spacing="1">
            CONSTRUCTION TASK
          </text>

          ${this._monthTicks(tlW, svgH)}

          <line x1="0" y1=${HEADER_H} x2=${LABEL_W + tlW} y2=${HEADER_H}
                stroke="rgba(255,255,255,0.12)" stroke-width="1" />

          <line x1=${LABEL_W} y1="0" x2=${LABEL_W} y2=${svgH}
                stroke="rgba(255,255,255,0.12)" stroke-width="1" />

          ${this._taskRows(tlW)}

          ${this.tasks.length === 0
            ? svg`
              <text x=${LABEL_W + tlW / 2} y=${HEADER_H + ROW_H / 2}
                    fill="rgba(255,255,255,0.35)"
                    font-size="12" font-family="sans-serif"
                    text-anchor="middle" dominant-baseline="middle">
                Click "Auto-Generate" to build tasks from your loaded BIM model
              </text>`
            : ""}

          ${this._renderPlayhead(tlW, svgH)}
        </svg>
      </div>
    `;
  }
}

if (!customElements.get("bim-gantt-chart")) {
  customElements.define("bim-gantt-chart", GanttChart);
}

declare global {
  interface HTMLElementTagNameMap {
    "bim-gantt-chart": GanttChart;
  }
}
