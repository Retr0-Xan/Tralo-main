import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ReservationItem {
    itemName: string;
    quantity: number;
}

export interface StockReservation {
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    items: ReservationItem[];
    reservedAt: string;
    expiresAt: string; // ISO date string
}

type ReservationsMap = Record<string, StockReservation>;

const STORAGE_KEY_PREFIX = "tralo_stock_reservations_";
const DEFAULT_EXPIRY_DAYS = 7;

function getStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
}

function loadReservations(userId: string): ReservationsMap {
    try {
        const raw = localStorage.getItem(getStorageKey(userId));
        if (!raw) return {};
        return JSON.parse(raw) as ReservationsMap;
    } catch {
        return {};
    }
}

function saveReservations(userId: string, reservations: ReservationsMap): void {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(reservations));
}

export function useStockReservations() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reservations, setReservations] = useState<ReservationsMap>({});

    // Load reservations and auto-expire on mount
    useEffect(() => {
        if (!user?.id) return;

        const stored = loadReservations(user.id);
        const now = new Date();
        let changed = false;
        const expiredNames: string[] = [];

        for (const [invoiceId, reservation] of Object.entries(stored)) {
            if (new Date(reservation.expiresAt) <= now) {
                expiredNames.push(reservation.invoiceNumber);
                delete stored[invoiceId];
                changed = true;
            }
        }

        if (changed) {
            saveReservations(user.id, stored);
            if (expiredNames.length > 0) {
                toast({
                    title: "Reservations Expired",
                    description: `Stock released for: ${expiredNames.join(", ")}`,
                });
            }
        }

        setReservations(stored);
    }, [user?.id]);

    const reserveStock = useCallback(
        (
            invoiceId: string,
            invoiceNumber: string,
            customerName: string,
            items: ReservationItem[],
            dueDate?: string
        ) => {
            if (!user?.id) return;

            const expiresAt = dueDate
                ? new Date(dueDate + "T23:59:59").toISOString()
                : new Date(
                    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
                ).toISOString();

            const reservation: StockReservation = {
                invoiceId,
                invoiceNumber,
                customerName,
                items,
                reservedAt: new Date().toISOString(),
                expiresAt,
            };

            setReservations((prev) => {
                const updated = { ...prev, [invoiceId]: reservation };
                saveReservations(user.id, updated);
                return updated;
            });
        },
        [user?.id]
    );

    const cancelReservation = useCallback(
        (invoiceId: string) => {
            if (!user?.id) return;

            setReservations((prev) => {
                const updated = { ...prev };
                delete updated[invoiceId];
                saveReservations(user.id, updated);
                return updated;
            });
        },
        [user?.id]
    );

    const isReserved = useCallback(
        (invoiceId: string): boolean => {
            return invoiceId in reservations;
        },
        [reservations]
    );

    // Calculate total reserved quantity for a given product name (case-insensitive)
    const getReservedQuantity = useCallback(
        (productName: string): number => {
            const lowerName = productName.toLowerCase();
            let total = 0;
            for (const reservation of Object.values(reservations)) {
                for (const item of reservation.items) {
                    if (item.itemName.toLowerCase() === lowerName) {
                        total += item.quantity;
                    }
                }
            }
            return total;
        },
        [reservations]
    );

    // Get available stock = current_stock - reserved
    const getAvailableStock = useCallback(
        (productName: string, currentStock: number): number => {
            return Math.max(0, currentStock - getReservedQuantity(productName));
        },
        [getReservedQuantity]
    );

    // Get all active reservations as an array
    const activeReservations = Object.values(reservations);

    return {
        reservations,
        activeReservations,
        reserveStock,
        cancelReservation,
        isReserved,
        getReservedQuantity,
        getAvailableStock,
    };
}
