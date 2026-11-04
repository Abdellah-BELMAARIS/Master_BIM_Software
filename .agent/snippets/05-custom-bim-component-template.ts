/**
 * Snippet 05: Custom BIM Component Pattern (DataEnhancer & SmartViews - Module 4)
 * Covers Lessons 4.1 - 5.5:
 * - Extending OBC.Component and implementing OBC.Disposable
 * - Registering a unique UUID and using OBC.Event<T> for reactive UI updates
 */

import * as OBC from "@thatopen/components";

export interface SmartViewState {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export class SmartViewsComponent extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "bimpulse-custom-smart-views-uuid" as const;
  enabled = true;

  readonly onDisposed = new OBC.Event();
  readonly onViewsUpdated = new OBC.Event<SmartViewState[]>();

  private _views: Map<string, SmartViewState> = new Map();

  constructor(components: OBC.Components) {
    super(components);
    components.add(SmartViewsComponent.uuid, this);
  }

  get list(): SmartViewState[] {
    return Array.from(this._views.values());
  }

  saveCurrentView(name: string, world: OBC.World): SmartViewState {
    const controls = (world.camera as OBC.SimpleCamera).controls;
    const pos = controls.getPosition( controls.camera.position.clone() );
    const target = controls.getTarget( controls.camera.position.clone() );

    const view: SmartViewState = {
      id: crypto.randomUUID(),
      name,
      cameraPosition: [pos.x, pos.y, pos.z],
      cameraTarget: [target.x, target.y, target.z],
    };

    this._views.set(view.id, view);
    this.onViewsUpdated.trigger(this.list);
    return view;
  }

  async applyView(id: string, world: OBC.World): Promise<void> {
    const view = this._views.get(id);
    if (!view) return;
    const controls = (world.camera as OBC.SimpleCamera).controls;
    await controls.setLookAt(
      ...view.cameraPosition,
      ...view.cameraTarget,
      true
    );
  }

  dispose(): void {
    this._views.clear();
    this.onViewsUpdated.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
