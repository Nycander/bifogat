import React, { useState, useEffect, useCallback } from "react";
import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  AppMeta,
  OutboxOp,
  SyncConflict,
  EventType,
} from "./domain/types";
import {
  hiveRepository,
  eventRepository,
  taskRepository,
  harvestRepository,
  transactionRepository,
  metaRepository,
  outboxRepository,
  conflictRepository,
} from "./storage/repositories";
import { exportAllData, restoreAllData, clearStore } from "./storage/db";
import { syncEngine, SyncEngineStatus } from "./sync/syncEngine";
import { sheetsClient } from "./sync/sheetsClient";
import {
  signInWithGoogle,
  logoutGoogle,
  initAuth,
  getCurrentUser,
  getAccessToken,
} from "./auth/googleAuth";
import { useOnlineStatus } from "./pwa/useOnlineStatus";
import { PWAInstallButton } from "./pwa/PWAInstallButton";
import { OfflineIndicator } from "./pwa/OfflineIndicator";
import { NavBar, NavTab } from "./components/NavBar";
import { SyncStatusBar } from "./components/SyncStatusBar";

import { OverviewView } from "./features/overview/OverviewView";
import { HivesView } from "./features/hives/HivesView";
import { HiveDetailModal } from "./features/hives/HiveDetailModal";
import { HiveEditModal } from "./features/hives/HiveEditModal";
import { EventFormModal } from "./features/events/EventFormModal";
import { TasksView } from "./features/tasks/TasksView";
import { TaskFormModal } from "./features/tasks/TaskFormModal";
import { HarvestsView } from "./features/harvests/HarvestsView";
import { HarvestFormModal } from "./features/harvests/HarvestFormModal";
import { EconomyView } from "./features/economy/EconomyView";
import { TransactionFormModal } from "./features/economy/TransactionFormModal";
import { SettingsView } from "./features/settings/SettingsView";
import { ConflictModal } from "./features/settings/ConflictModal";
import { OutboxPreviewModal } from "./features/settings/OutboxPreviewModal";
import { CsvImportModal } from "./features/settings/CsvImportModal";
import { NotesImportModal } from "./features/settings/NotesImportModal";
import { ParsedNotesResult } from "./import/notesParser";

export default function App() {
  const isOnline = useOnlineStatus();

  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>("overview");

  // Application Data in Local Working Memory
  const [hives, setHives] = useState<Hive[]>([]);
  const [events, setEvents] = useState<HiveEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<AppMeta>({ key: "config", schemaVersion: 1 });
  const [outboxOps, setOutboxOps] = useState<OutboxOp[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  // Auth & Sync State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>(syncEngine.getStatusSync());

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [preselectedHiveId, setPreselectedHiveId] = useState<string | undefined>();
  const [showHiveModal, setShowHiveModal] = useState(false);
  const [editingHive, setEditingHive] = useState<Hive | undefined>();
  const [selectedHiveDetail, setSelectedHiveDetail] = useState<Hive | null>(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | undefined>();

  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showOutboxPreviewModal, setShowOutboxPreviewModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showNotesImportModal, setShowNotesImportModal] = useState(false);

  // Load all local data from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const [hList, eList, tList, harList, txList, m, oList, cList] = await Promise.all([
        hiveRepository.getAll(),
        eventRepository.getAll(),
        taskRepository.getAll(),
        harvestRepository.getAll(),
        transactionRepository.getAll(),
        metaRepository.get(),
        outboxRepository.getAll(),
        conflictRepository.getAll(),
      ]);

      // Seed initial sample hives if completely empty
      if (hList.length === 0 && txList.length === 0) {
        const hiveA = await hiveRepository.create({
          name: "Kupa A",
          status: "active",
          notes: "Stark koloni på Svea-ram. Drottning från 2025.",
        });
        const hiveB = await hiveRepository.create({
          name: "Kupa B",
          status: "active",
          notes: "Ny avläggare från maj 2026.",
        });
        await taskRepository.create({
          title: "Vårkontroll och koll av yngelsättning",
          notes: "Kontrollera foderstatus och att drottningen lägger ägg.",
          dueDate: new Date().toISOString().substring(0, 10),
          status: "open",
          hiveId: hiveA.id,
        });

        // reload seeded
        const [freshH, freshT] = await Promise.all([
          hiveRepository.getAll(),
          taskRepository.getAll(),
        ]);
        setHives(freshH);
        setTasks(freshT);
      } else {
        setHives(hList);
        setTasks(tList);
      }

      setEvents(eList);
      setHarvests(harList);
      setTransactions(txList);
      setMeta(m);
      setOutboxOps(oList);
      setConflicts(cList);

      const status = await syncEngine.getStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error("Failed to load IndexedDB data:", err);
    }
  }, []);

  // Initial load and Auth listener setup
  useEffect(() => {
    reloadData();

    // Listen to Firebase auth changes
    initAuth(
      (user) => {
        setCurrentUser(user);
        syncEngine.triggerSync().then(() => reloadData());
      },
      () => {
        setCurrentUser(null);
      },
    );

    // Sync engine status listener
    const unsubscribeSync = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeSync();
    };
  }, [reloadData]);

  // Keep detail hive up-to-date if hives change
  useEffect(() => {
    if (selectedHiveDetail) {
      const updated = hives.find((h) => h.id === selectedHiveDetail.id);
      if (updated) setSelectedHiveDetail(updated);
    }
  }, [hives, selectedHiveDetail]);

  /* ==========================================================================
     Actions
     ========================================================================== */
  const handleSyncNow = async () => {
    await syncEngine.triggerSync();
    await reloadData();
  };

  const handleSignIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        setCurrentUser(res.user);
        await syncEngine.triggerSync();
        await reloadData();
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        alert(
          `Firebase-fel (auth/unauthorized-domain):\n\n` +
          `Domänen 'nycander.github.io' är inte auktoriserad i Firebase.\n\n` +
          `Gör så här:\n` +
          `1. Gå till Firebase Console (console.firebase.google.com)\n` +
          `2. Välj ditt projekt och gå till Authentication -> Settings -> Authorized domains\n` +
          `3. Lägg till 'nycander.github.io'`
        );
      } else {
        alert(`Inloggning misslyckades: ${err.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setCurrentUser(null);
  };

  const handleSaveSpreadsheetId = async (id: string, title?: string) => {
    await metaRepository.save({ spreadsheetId: id, spreadsheetTitle: title });
    await reloadData();
    await syncEngine.triggerSync();
    await reloadData();
  };

  const handleCreateNewSpreadsheet = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Logga in med Google först");
    const created = await sheetsClient.createSpreadsheet(token, "Bifogat - Biodlingsloggbok");
    await handleSaveSpreadsheetId(created.id, created.title);
  };

  // Hive Handlers
  const handleSaveHive = async (data: { name: string; status: Hive["status"]; notes?: string }) => {
    if (editingHive) {
      await hiveRepository.update(editingHive.id, data);
    } else {
      await hiveRepository.create(data);
    }
    await reloadData();
    setEditingHive(undefined);
  };

  // Event Handlers
  const handleSaveEvent = async (data: {
    hiveId: string;
    date: string;
    type: EventType;
    title: string;
    notes: string;
  }) => {
    await eventRepository.create(data);
    await reloadData();
  };

  // Task Handlers
  const handleToggleTask = async (id: string) => {
    await taskRepository.toggleComplete(id);
    await reloadData();
  };

  const handleSaveTask = async (data: {
    title: string;
    notes?: string;
    hiveId?: string;
    dueDate?: string;
  }) => {
    if (editingTask) {
      await taskRepository.update(editingTask.id, data);
    } else {
      await taskRepository.create({ ...data, status: "open" });
    }
    await reloadData();
    setEditingTask(undefined);
  };

  const handleDeleteTask = async (id: string) => {
    await taskRepository.delete(id);
    await reloadData();
  };

  // Harvest Handlers
  const handleSaveHarvest = async (data: {
    date: string;
    hiveId?: string;
    honeyWeightGrams?: number;
    jarSizeGrams?: number;
    jarCount?: number;
    notes?: string;
  }) => {
    if (editingHarvest) {
      await harvestRepository.update(editingHarvest.id, data);
    } else {
      await harvestRepository.create(data);
    }
    await reloadData();
    setEditingHarvest(undefined);
  };

  const handleDeleteHarvest = async (id: string) => {
    await harvestRepository.delete(id);
    await reloadData();
  };

  // Transaction Handlers
  const handleSaveTransaction = async (data: {
    date: string;
    description: string;
    amountOre: number;
    counterparty?: string;
    category?: string;
  }) => {
    if (editingTx) {
      await transactionRepository.update(editingTx.id, data);
    } else {
      await transactionRepository.create({ ...data, source: "manual" });
    }
    await reloadData();
    setEditingTx(undefined);
  };

  const handleDeleteTransaction = async (id: string) => {
    await transactionRepository.delete(id);
    await reloadData();
  };

  // Conflict Resolution
  const handleResolveConflict = async (conflictId: string, keepLocal: boolean) => {
    await conflictRepository.resolveConflict(conflictId, keepLocal);
    await reloadData();
    await syncEngine.triggerSync();
    await reloadData();
  };

  // Safe Push Outbox to Sheets
  const handleConfirmPushOutbox = async () => {
    await syncEngine.pushPendingOutbox();
    await reloadData();
  };

  // Clear Outbox without pushing
  const handleClearOutbox = async () => {
    await outboxRepository.clear();
    await reloadData();
  };

  // Toggle manual write confirmation
  const handleToggleManualConfirmation = async (enabled: boolean) => {
    await metaRepository.save({ requireManualWriteConfirmation: enabled });
    await reloadData();
  };

  // CSV Import
  const handleConfirmCsvImport = async (
    transactionsToImport: Transaction[],
    lastBalanceOre: number | null,
  ) => {
    for (const tx of transactionsToImport) {
      await transactionRepository.create({
        date: tx.date,
        description: tx.description,
        amountOre: tx.amountOre,
        counterparty: tx.counterparty,
        category: tx.category,
        source: "import",
      });
    }
    if (lastBalanceOre !== null) {
      await metaRepository.save({ importedHistoricalBalanceOre: lastBalanceOre });
    }
    await reloadData();
    setActiveTab("economy");
  };

  // Notes Import
  const handleConfirmNotesImport = async (result: ParsedNotesResult) => {
    // 1. Create any new discovered hives
    const hiveNameToIdMap = new Map<string, string>();
    for (const h of hives) {
      hiveNameToIdMap.set(h.name.toLowerCase().trim(), h.id);
    }

    for (const h of result.detectedHives) {
      const lower = h.name.toLowerCase().trim();
      if (!hiveNameToIdMap.has(lower)) {
        const created = await hiveRepository.create({
          name: h.name,
          status: "active",
          notes: "Skapad automatiskt vid import av anteckningar",
        });
        hiveNameToIdMap.set(lower, created.id);
      }
    }

    // 2. Create tasks
    for (const t of result.tasks) {
      await taskRepository.create({
        title: t.title,
        notes: t.notes,
        status: t.status,
      });
    }

    // 3. Create events
    for (const e of result.events) {
      const hId = hiveNameToIdMap.get(e.hiveName.toLowerCase().trim()) || hives[0]?.id;
      if (hId) {
        await eventRepository.create({
          hiveId: hId,
          date: e.date,
          type: e.type,
          title: e.title,
          notes: e.notes,
        });
      }
    }

    // 4. Create harvests
    for (const h of result.harvests) {
      const hId = h.hiveName ? hiveNameToIdMap.get(h.hiveName.toLowerCase().trim()) : undefined;
      await harvestRepository.create({
        date: h.date,
        hiveId: hId,
        honeyWeightGrams: h.honeyWeightGrams,
        jarCount: h.jarCount,
        jarSizeGrams: h.jarSizeGrams,
        notes: h.notes,
      });
    }

    await reloadData();
    setActiveTab("overview");
  };

  // Full Data Export
  const handleExportBackup = async () => {
    const backup = await exportAllData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bifogat-biodling-backup-${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear Local Data
  const handleClearLocalData = async () => {
    await clearStore("hives");
    await clearStore("events");
    await clearStore("tasks");
    await clearStore("harvests");
    await clearStore("transactions");
    await clearStore("outbox");
    await clearStore("conflicts");
    await reloadData();
  };

  return (
    <div className="app-container">
      <OfflineIndicator />

      {/* Header */}
      <header className="app-header">
        <a
          href="#home"
          className="header-brand"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("overview");
          }}
        >
          <img src="/icon.svg" alt="Bifogat logotyp" className="header-logo" />
          <div className="header-title-group">
            <span className="header-title">Bifogat</span>
            <span className="header-subtitle">Biodlingsloggbok</span>
          </div>
        </a>

        <div className="header-actions">
          <PWAInstallButton />
          <SyncStatusBar
            status={syncStatus}
            isOnline={isOnline}
            onSyncNow={handleSyncNow}
            onOpenConflicts={() => setShowConflictModal(true)}
            onOpenOutboxPreview={() => setShowOutboxPreviewModal(true)}
          />
        </div>
      </header>

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === "overview" && (
          <OverviewView
            hives={hives}
            events={events}
            tasks={tasks}
            harvests={harvests}
            transactions={transactions}
            syncStatus={syncStatus}
            onOpenLogEvent={() => {
              setPreselectedHiveId(undefined);
              setShowEventModal(true);
            }}
            onOpenCreateTask={() => {
              setEditingTask(undefined);
              setShowTaskModal(true);
            }}
            onToggleTask={handleToggleTask}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onSelectHive={(hive) => setSelectedHiveDetail(hive)}
          />
        )}

        {activeTab === "hives" && (
          <HivesView
            hives={hives}
            events={events}
            onOpenHiveDetail={(hive) => setSelectedHiveDetail(hive)}
            onOpenCreateHive={() => {
              setEditingHive(undefined);
              setShowHiveModal(true);
            }}
            onLogEventForHive={(hiveId) => {
              setPreselectedHiveId(hiveId);
              setShowEventModal(true);
            }}
          />
        )}

        {activeTab === "tasks" && (
          <TasksView
            tasks={tasks}
            hives={hives}
            onToggleTask={handleToggleTask}
            onOpenCreateTask={() => {
              setEditingTask(undefined);
              setShowTaskModal(true);
            }}
            onEditTask={(task) => {
              setEditingTask(task);
              setShowTaskModal(true);
            }}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === "harvests" && (
          <HarvestsView
            harvests={harvests}
            hives={hives}
            onOpenCreateHarvest={() => {
              setEditingHarvest(undefined);
              setShowHarvestModal(true);
            }}
            onDeleteHarvest={handleDeleteHarvest}
          />
        )}

        {activeTab === "economy" && (
          <EconomyView
            transactions={transactions}
            importedHistoricalBalanceOre={meta.importedHistoricalBalanceOre}
            onOpenCreateTransaction={() => {
              setEditingTx(undefined);
              setShowTxModal(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setShowTxModal(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            meta={meta}
            currentUser={currentUser}
            syncStatus={syncStatus}
            outboxOps={outboxOps}
            conflicts={conflicts}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onSaveSpreadsheetId={handleSaveSpreadsheetId}
            onCreateNewSpreadsheet={handleCreateNewSpreadsheet}
            onSyncNow={handleSyncNow}
            onOpenConflicts={() => setShowConflictModal(true)}
            onOpenOutboxPreview={() => setShowOutboxPreviewModal(true)}
            onToggleManualConfirmation={handleToggleManualConfirmation}
            onOpenCsvImport={() => setShowCsvImportModal(true)}
            onOpenNotesImport={() => setShowNotesImportModal(true)}
            onExportBackup={handleExportBackup}
            onClearLocalData={handleClearLocalData}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile and Quick Desktop Access */}
      <NavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        openTaskCount={tasks.filter((t) => t.status === "open").length}
      />

      {/* Modals */}
      {showOutboxPreviewModal && (
        <OutboxPreviewModal
          outboxOps={outboxOps}
          onClose={() => setShowOutboxPreviewModal(false)}
          onConfirmPush={handleConfirmPushOutbox}
          onClearOutbox={handleClearOutbox}
        />
      )}
      {showEventModal && (
        <EventFormModal
          hives={hives}
          initialHiveId={preselectedHiveId}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
        />
      )}

      {showHiveModal && (
        <HiveEditModal
          hive={editingHive}
          onClose={() => setShowHiveModal(false)}
          onSave={handleSaveHive}
        />
      )}

      {selectedHiveDetail && (
        <HiveDetailModal
          hive={selectedHiveDetail}
          events={events}
          onClose={() => setSelectedHiveDetail(null)}
          onLogEvent={(hiveId) => {
            setSelectedHiveDetail(null);
            setPreselectedHiveId(hiveId);
            setShowEventModal(true);
          }}
          onEditHive={(hive) => {
            setSelectedHiveDetail(null);
            setEditingHive(hive);
            setShowHiveModal(true);
          }}
        />
      )}

      {showTaskModal && (
        <TaskFormModal
          task={editingTask}
          hives={hives}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
        />
      )}

      {showHarvestModal && (
        <HarvestFormModal
          harvest={editingHarvest}
          hives={hives}
          onClose={() => setShowHarvestModal(false)}
          onSave={handleSaveHarvest}
        />
      )}

      {showTxModal && (
        <TransactionFormModal
          transaction={editingTx}
          onClose={() => setShowTxModal(false)}
          onSave={handleSaveTransaction}
        />
      )}

      {showConflictModal && (
        <ConflictModal
          conflicts={conflicts}
          onClose={() => setShowConflictModal(false)}
          onResolve={handleResolveConflict}
        />
      )}

      {showCsvImportModal && (
        <CsvImportModal
          existingTransactions={transactions}
          onClose={() => setShowCsvImportModal(false)}
          onConfirmImport={handleConfirmCsvImport}
          onExportBackup={handleExportBackup}
        />
      )}

      {showNotesImportModal && (
        <NotesImportModal
          existingHives={hives}
          onClose={() => setShowNotesImportModal(false)}
          onConfirmImport={handleConfirmNotesImport}
          onExportBackup={handleExportBackup}
        />
      )}
    </div>
  );
}
