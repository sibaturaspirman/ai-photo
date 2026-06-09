"use client";

import "./inaco-virtual-keyboard.css";

type KeyboardMode = "text" | "numeric" | "username";

type InacoVirtualKeyboardProps = {
  mode: KeyboardMode;
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClose: () => void;
};

const TEXT_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const USERNAME_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", "_", "."],
];

const NUMERIC_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0"],
];

function KeyButton({
  label,
  wide,
  onClick,
}: {
  label: string;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inaco-vk__key ${wide ? "inaco-vk__key--wide" : ""}`}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function InacoVirtualKeyboard({ mode, onInput, onBackspace, onClose }: InacoVirtualKeyboardProps) {
  const rows =
    mode === "numeric" ? NUMERIC_ROWS : mode === "username" ? USERNAME_ROWS : TEXT_ROWS;

  return (
    <div className="inaco-vk" role="group" aria-label="Virtual keyboard">
      <div className="inaco-vk__toolbar">
        <button
          type="button"
          className="inaco-vk__action"
          onPointerDown={(event) => event.preventDefault()}
          onClick={onClose}
        >
          Tutup
        </button>
      </div>

      <div className={`inaco-vk__rows ${mode === "numeric" ? "inaco-vk__rows--numeric" : ""}`}>
        {rows.map((row) => (
          <div key={row.join("-")} className="inaco-vk__row">
            {row.map((key) => (
              <KeyButton key={key} label={key} onClick={() => onInput(key)} />
            ))}
          </div>
        ))}
      </div>

      <div className="inaco-vk__bottom">
        {mode !== "numeric" ? (
          <KeyButton label="Spasi" wide onClick={() => onInput(" ")} />
        ) : null}
        <KeyButton label="⌫" wide onClick={onBackspace} />
      </div>
    </div>
  );
}
