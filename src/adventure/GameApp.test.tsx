import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import GameApp from "./GameApp";
import { createGame, reduceGame, type GameState } from "./engine";
import { BACKUP_KEY, loadGame, SAVE_KEY, saveGame } from "./save";

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
const originalMatchMedia = Object.getOwnPropertyDescriptor(
  window,
  "matchMedia",
);

beforeAll(() => {
  // jsdom has dialog elements but no native top-layer behavior. Only implement
  // opening/closing here; focus trapping and inertness require browser testing.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(Math, "random").mockReturnValue(0);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
afterAll(() => {
  if (originalShowModal)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "showModal",
      originalShowModal,
    );
  else
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)
      .showModal;
  if (originalClose)
    Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  if (originalMatchMedia)
    Object.defineProperty(window, "matchMedia", originalMatchMedia);
  else delete (window as Partial<Window>).matchMedia;
});

function click(
  name: string | RegExp,
  scope: HTMLElement = document.body,
): void {
  fireEvent.click(within(scope).getByRole("button", { name }));
}
function stored(): GameState {
  const result = loadGame();
  expect(result.status).toBe("loaded");
  return result.state!;
}
function seed(state: GameState): void {
  expect(saveGame(state).ok).toBe(true);
}
function addPartner(state: GameState, speciesId: number): GameState {
  const encounter = reduceGame(
    state,
    { type: "encounter", speciesId },
    () => 0,
  );
  const caught = reduceGame(encounter, { type: "catch" }, () => 0);
  return reduceGame(caught, { type: "finishBattle" });
}

describe("trainer adventure player journeys", () => {
  it("starts with pictured partners and opens four actual moves", () => {
    render(<GameApp />);
    click("和皮卡丘出发");
    expect(
      screen.getByRole("main", { name: "常磐市探索场景" }),
    ).toBeInTheDocument();
    click("遇见绿毛虫");
    click("招式");
    expect(screen.getByRole("button", { name: /电磁波/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /命中/ })).toHaveLength(4);
  });
  it("lets the player choose a real ball and stores the capture", () => {
    render(<GameApp />);
    click("和皮卡丘出发");
    click("遇见绿毛虫");
    click("捕捉");
    click(/精灵球 ×10/);
    expect(screen.getByText("遇见新伙伴！")).toBeInTheDocument();
    expect(stored().roster).toHaveLength(2);
    expect(stored().journey?.balls.poke).toBe(9);
  });
  it("shows trainer dialogue and allows declining without starting combat", () => {
    seed(createGame(25));
    render(<GameApp />);
    click("训练家 1");
    expect(screen.getByText("旅行训练家小岚")).toBeInTheDocument();
    click("下次再切磋");
    expect(stored().battle).toBeNull();
    click("训练家 1");
    click("接受挑战");
    expect(stored().battle?.kind).toBe("trainer");
    expect(screen.getByRole("button", { name: "挑战中" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "离开" })).toBeDisabled();
  });
  it("persists a purchase and prevents unaffordable exchanges", () => {
    seed(createGame(25));
    render(<GameApp />);
    click("商城");
    const article = screen
      .getByRole("heading", { name: "高级球" })
      .closest("article")!;
    click("80 金币兑换", article);
    expect(stored().journey?.coins).toBe(120);
    expect(stored().journey?.balls.ultra).toBe(1);
    click("80 金币兑换", article);
    expect(within(article).getByRole("button")).toBeDisabled();
  });
  it("keeps unopened cities locked and presents the clue objectives", () => {
    seed(createGame(25));
    render(<GameApp />);
    expect(screen.getByText(/调查路标 0\/2/)).toBeInTheDocument();
    click(/地图.*去新地方/);
    expect(screen.getByRole("button", { name: /华蓝市/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /流星瀑布/ })).toBeDisabled();
  });
  it("persists reduced motion and reports a blocked storage write", () => {
    seed(createGame(25));
    render(<GameApp />);
    click("设置");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(stored().settings.reducedMotion).toBe(true);
    expect(document.querySelector(".journey-shell")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
  });
});
