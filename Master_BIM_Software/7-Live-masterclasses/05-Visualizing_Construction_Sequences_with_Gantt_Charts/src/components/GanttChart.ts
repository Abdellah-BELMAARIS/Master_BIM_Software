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
}

const LABEL_W = 180;
const ROW_H = 36;
const HEADER_H = 30;
const BAR_H = 20;
const BAR_R = 4;
const BAR_Y_PAD = (ROW_H - BAR_H) / 2;
const HANDLE_SIZE = 7; // half-width of the triangle handle

export class GanttChart extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
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
    _w: { state: true },
    _playheadRatio: { state: true },
  };

  declare tasks: GanttTask[];
  declare private _w: number;
  declare private _playheadRatio: number;

  private _ro: ResizeObserver | null = null;

  constructor() {
    super();
    this.tasks = [];
    this._w = 0;
    this._playheadRatio = 0; // starts at the left edge of the timeline
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  private _onRef = (el?: Element) => {
    if (!el) return;
    this._w = (el as HTMLElement).clientWidth;
    this._ro = new ResizeObserver(([entry]) => {
      this._w = entry.contentRect.width;
    });
    this._ro.observe(el);
  };

  // ── derived timeline bounds ─────────────────────────────────────────────

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

  // ── coordinate helpers ──────────────────────────────────────────────────

  private _x(date: Date, tlW: number): number {
    return LABEL_W + ((date.getTime() - this._start.getTime()) / this._span) * tlW;
  }

  // ── playhead drag ───────────────────────────────────────────────────────

  private _onPlayheadMouseDown = (e: MouseEvent) => {
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      const svg = this.shadowRoot?.querySelector("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const tlW = Math.max(1, this._w - LABEL_W);
      const offsetX = ev.clientX - rect.left - LABEL_W;
      const ratio = Math.max(0, Math.min(1, offsetX / tlW));
      this._playheadRatio = ratio;

      const date = new Date(
        this._start.getTime() + ratio * this._span,
      );
      this.dispatchEvent(
        new CustomEvent<{ date: Date }>("playheadchange", {
          detail: { date },
          bubbles: true,
          composed: true,
        }),
      );
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── SVG fragments ───────────────────────────────────────────────────────

  private _monthTicks(tlW: number, totalH: number) {
    const marks: unknown[] = [];
    const cursor = new Date(this._start.getFullYear(), this._start.getMonth(), 1);

    while (cursor.getTime() <= this._end.getTime()) {
      const x = this._x(cursor, tlW);
      const label = cursor.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      marks.push(svg`
        <line x1=${x} y1="0" x2=${x} y2=${totalH}
              stroke="rgba(255,255,255,0.07)" stroke-width="1" />
        <text x=${x + 5} y=${HEADER_H / 2 + 4}
              fill="rgba(255,255,255,0.35)"
              font-size="11" font-family="sans-serif">
          ${label}
        </text>
      `);

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return marks;
  }

  private _taskRows(tlW: number) {
    return this.tasks.map((task, i) => {
      const rowY = HEADER_H + i * ROW_H;
      const x0 = this._x(task.startDate, tlW);
      const x1 = this._x(task.endDate, tlW);
      const bw = Math.max(4, x1 - x0);
      const by = rowY + BAR_Y_PAD;

      return svg`
        <g>
          <rect x="0" y=${rowY}
                width=${LABEL_W + tlW} height=${ROW_H}
                fill=${i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"} />

          <text x=${LABEL_W - 10} y=${rowY + ROW_H / 2}
                fill="rgba(255,255,255,0.65)"
                font-size="12" font-family="sans-serif"
                text-anchor="end" dominant-baseline="middle">
            ${task.name}
          </text>

          <rect x=${x0} y=${by} width=${bw} height=${BAR_H}
                rx=${BAR_R} ry=${BAR_R}
                fill=${task.color}
                style="cursor:pointer"
                @click=${() => this._emitTaskClick(task)} />

          ${bw > 55
            ? svg`
              <text x=${x0 + bw / 2} y=${by + BAR_H / 2}
                    fill="rgba(255,255,255,0.9)"
                    font-size="11" font-family="sans-serif" font-weight="600"
                    text-anchor="middle" dominant-baseline="middle"
                    pointer-events="none">
                ${task.name}
              </text>`
            : ""}
        </g>
      `;
    });
  }

  private _renderPlayhead(tlW: number, svgH: number) {
    const px = LABEL_W + this._playheadRatio * tlW;

    // Triangle handle pointing downward, sitting in the header row
    const handlePoints = `
      ${px - HANDLE_SIZE},2
      ${px + HANDLE_SIZE},2
      ${px},${HEADER_H - 4}
    `;

    return svg`
      <g @mousedown=${this._onPlayheadMouseDown} style="cursor:ew-resize">
        <!-- wider invisible hit area for easier grabbing -->
        <rect x=${px - 8} y="0" width="16" height=${svgH}
              fill="transparent" />

        <!-- vertical line -->
        <line x1=${px} y1="0" x2=${px} y2=${svgH}
              stroke="rgba(255,255,255,0.85)" stroke-width="1.5"
              pointer-events="none" />

        <!-- triangle handle -->
        <polygon points=${handlePoints}
                 fill="white" opacity="0.9"
                 pointer-events="none" />
      </g>
    `;
  }

  // ── events ──────────────────────────────────────────────────────────────

  private _emitTaskClick(task: GanttTask) {
    this.dispatchEvent(
      new CustomEvent<{ task: GanttTask }>("taskclick", {
        detail: { task },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── render ──────────────────────────────────────────────────────────────

  render() {
    const tlW = Math.max(0, this._w - LABEL_W);
    const svgH = HEADER_H + Math.max(1, this.tasks.length) * ROW_H;

    return html`
      <div class="wrapper" ${ref(this._onRef)}>
        <svg width=${this._w} height=${svgH}>

          <!-- header background -->
          <rect x="0" y="0" width=${this._w} height=${HEADER_H}
                fill="rgba(255,255,255,0.035)" />

          <!-- "TASK" column label -->
          <text x=${LABEL_W / 2} y=${HEADER_H / 2 + 4}
                fill="rgba(255,255,255,0.3)"
                font-size="10" font-family="sans-serif"
                text-anchor="middle" letter-spacing="1">
            TASK
          </text>

          <!-- month ticks & labels -->
          ${this._monthTicks(tlW, svgH)}

          <!-- header bottom rule -->
          <line x1="0" y1=${HEADER_H} x2=${this._w} y2=${HEADER_H}
                stroke="rgba(255,255,255,0.1)" stroke-width="1" />

          <!-- label / timeline divider -->
          <line x1=${LABEL_W} y1="0" x2=${LABEL_W} y2=${svgH}
                stroke="rgba(255,255,255,0.1)" stroke-width="1" />

          <!-- task rows -->
          ${this._taskRows(tlW)}

          <!-- empty state -->
          ${this.tasks.length === 0
            ? svg`
              <text x=${this._w / 2} y=${HEADER_H + ROW_H / 2}
                    fill="rgba(255,255,255,0.2)"
                    font-size="13" font-family="sans-serif"
                    text-anchor="middle" dominant-baseline="middle">
                No tasks defined yet
              </text>`
            : ""}

          <!-- playhead — rendered last so it sits on top -->
          ${this._renderPlayhead(tlW, svgH)}

        </svg>
      </div>
    `;
  }
}

customElements.define("bim-gantt-chart", GanttChart);

declare global {
  interface HTMLElementTagNameMap {
    "bim-gantt-chart": GanttChart;
  }
}
