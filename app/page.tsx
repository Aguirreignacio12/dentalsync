import { PracticeWorkspace } from "@/components/practice/practice-workspace"
import { getDateKeyInArgentina, getGreetingInArgentina } from "@/components/practice/formatters"

export const dynamic = "force-dynamic"

export default function Page() {
  const now = new Date()
  return <PracticeWorkspace todayKey={getDateKeyInArgentina(now)} greeting={getGreetingInArgentina(now)} />
}
