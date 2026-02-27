// ============================================================================
// ExportDialog.tsx — Confirmation dialog before exporting .ROS file
// ============================================================================

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExportDialogProps {
    fileName: string;
    editCount: number;
    affectedPlayerCount: number;
    disabled: boolean;
    onConfirm: () => void;
}

export function ExportDialog({
    fileName,
    editCount,
    affectedPlayerCount,
    disabled,
    onConfirm,
}: ExportDialogProps) {
    const button = (
        <Button disabled={disabled} className="gap-1.5">
            💾 Export .ROS
        </Button>
    );

    // When disabled, wrap in tooltip explaining why
    if (disabled) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0} className="inline-flex">{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>No edits to export</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {button}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Export Roster File</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                You're about to compile and download the modified roster file
                                with CRC32 checksum recalculation.
                            </p>
                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
                                <span className="text-muted-foreground">File</span>
                                <span className="font-mono font-medium truncate">{fileName}</span>
                                <span className="text-muted-foreground">Edits</span>
                                <span className="font-mono font-bold text-primary">{editCount}</span>
                                <span className="text-muted-foreground">Players affected</span>
                                <span className="font-mono font-bold text-primary">{affectedPlayerCount}</span>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Compile & Download
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
