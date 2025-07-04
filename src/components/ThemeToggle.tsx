import { Moon, Sun } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-provider"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const isDark = theme === "dark"

    return (
        <div className="flex items-center gap-2">
            <Sun className={cn("h-4 w-4", !isDark && "text-primary")} />
            <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Toggle theme"
            />
            <Moon className={cn("h-4 w-4", isDark && "text-primary")} />
        </div>
    )
} 