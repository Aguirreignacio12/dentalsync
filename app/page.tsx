import { PracticeWorkspace } from "@/components/practice/practice-workspace"
import { getDateKeyInArgentina } from "@/components/practice/formatters"

export const dynamic = "force-dynamic"

export default function Page() {
  const now = new Date()
  return <PracticeWorkspace realTodayKey={getDateKeyInArgentina(now)} nowIso={now.toISOString()} />
}
