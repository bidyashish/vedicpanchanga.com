import { Modal, ModalHeader } from "@/components/ui/modal";
import { useI18n } from "@/i18n";
import type { SavedChart } from "@/types/api";
import { SavedChartTable } from "./SavedChartTable";

interface Props {
  open: boolean;
  onClose: () => void;
  charts: SavedChart[];
  limit: number;
  loading: boolean;
  onOpen: (chart: SavedChart) => void;
  onEdit: (chart: SavedChart) => void;
  onDelete: (chart: SavedChart) => void;
}

/** "Manage charts" dialog: the saved-chart table in a wide modal. */
export function ManageChartsModal({ open, onClose, ...table }: Props) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} wide>
      <div data-testid="manage-charts-modal">
        <ModalHeader onClose={onClose} closeLabel={t("pd_close")}>
          <h2 className="font-serif text-lead text-ink font-semibold">{t("saved_manage")}</h2>
        </ModalHeader>
        <SavedChartTable {...table} />
        <div className="mt-4 pt-3 border-t border-parchment-200 flex justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("pd_close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
