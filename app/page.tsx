import { PracticeWorkspace } from "@/components/practice/practice-workspace"
import { getDateKeyInArgentina } from "@/components/practice/formatters"

export default function Page() {
  return <PracticeWorkspace todayKey={getDateKeyInArgentina()} />
}
