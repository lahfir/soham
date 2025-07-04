"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    label: string;
}

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
    const formatDateForInput = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const formatTimeForInput = (date: Date): string => {
        return date.toTimeString().split(' ')[0].substring(0, 5);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (isNaN(newDate.getTime())) return;

        const updated = new Date(value);
        updated.setFullYear(newDate.getFullYear());
        updated.setMonth(newDate.getMonth());
        updated.setDate(newDate.getDate());

        onChange(updated);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [hours, minutes] = e.target.value.split(':');
        if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) return;

        const updated = new Date(value);
        updated.setHours(parseInt(hours, 10));
        updated.setMinutes(parseInt(minutes, 10));
        updated.setSeconds(0);

        onChange(updated);
    };

    return (
        <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
                {label}
            </Label>
            <div className="flex gap-2">
                <Input
                    type="date"
                    value={formatDateForInput(value)}
                    onChange={handleDateChange}
                    className="w-40 bg-background border-input"
                />
                <Input
                    type="time"
                    value={formatTimeForInput(value)}
                    onChange={handleTimeChange}
                    className="w-32 bg-background border-input"
                />
            </div>
        </div>
    );
} 