import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProfileCompletenessCard({ value }: { value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete profile</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Progress value={value} className="flex-1" />
        <div className="text-muted-foreground text-sm">%{value}</div>
      </CardContent>
    </Card>
  );
}
