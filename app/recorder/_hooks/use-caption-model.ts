import { useCallback, useEffect, useState } from "react";
import {
  getEnglishModelStatus,
  installEnglishModel,
  type CaptionModelStatus,
} from "@/app/recorder/_lib/live-captions";

export interface CaptionModel {
  status: CaptionModelStatus | "checking";
  installFailed: boolean;
  install: () => void;
}

export function useCaptionModel(): CaptionModel {
  const [status, setStatus] = useState<CaptionModelStatus | "checking">(
    "checking"
  );
  const [installFailed, setInstallFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getEnglishModelStatus().then((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const install = useCallback(() => {
    if (status !== "downloadable" && !installFailed) {
      return;
    }
    setInstallFailed(false);
    setStatus("downloading");
    // Called synchronously from the click so Chrome sees the user gesture.
    installEnglishModel()
      .then(async (ok) => {
        setStatus(await getEnglishModelStatus());
        setInstallFailed(!ok);
      })
      .catch(async () => {
        setStatus(await getEnglishModelStatus());
        setInstallFailed(true);
      });
  }, [installFailed, status]);

  return { status, installFailed, install };
}
