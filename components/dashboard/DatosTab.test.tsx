import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatosTab } from "./DatosTab";

vi.mock("@/app/(dashboard)/configuracion/data-actions", () => ({
  exportDataAction: vi.fn(),
  importDataAction: vi.fn(),
}));

import { exportDataAction, importDataAction } from "@/app/(dashboard)/configuracion/data-actions";

const exportDataMock = vi.mocked(exportDataAction);
const importDataMock = vi.mocked(importDataAction);

beforeEach(() => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:mock"), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DatosTab", () => {
  it("triggers an export download when the export button is clicked", async () => {
    const user = userEvent.setup();
    exportDataMock.mockResolvedValue({ version: 1, exportedAt: "2026-08-01", settings: null, subscriptions: [] });

    render(<DatosTab />);
    await user.click(screen.getByRole("button", { name: "Exportar mis datos" }));

    expect(exportDataMock).toHaveBeenCalled();
  });

  it(
    "imports a selected file and shows a success message",
    async () => {
      const user = userEvent.setup();
      importDataMock.mockResolvedValue({ success: true, importedSubscriptions: 3 });
      render(<DatosTab />);

      const file = new File(["{}"], "export.json", { type: "application/json" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(await screen.findByText("Se importaron 3 suscripciones.", {}, { timeout: 10000 })).toBeInTheDocument();
    },
    15000
  );

  it(
    "shows an error message when the import fails",
    async () => {
      const user = userEvent.setup();
      importDataMock.mockResolvedValue({
        error: "El archivo no tiene el formato esperado de una exportación de esta app.",
      });
      render(<DatosTab />);

      const file = new File(["{}"], "bad.json", { type: "application/json" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(
        await screen.findByText(
          "El archivo no tiene el formato esperado de una exportación de esta app.",
          {},
          { timeout: 10000 }
        )
      ).toBeInTheDocument();
    },
    15000
  );
});
