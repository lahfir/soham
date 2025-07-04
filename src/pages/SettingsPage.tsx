import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export function SettingsPage() {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Settings</h2>

            <div className="max-w-2xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize the look and feel of the application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="font-medium">Theme</p>
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Management</CardTitle>
                        <CardDescription>
                            Manage your tracked data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Data settings coming soon.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 