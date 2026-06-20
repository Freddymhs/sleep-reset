# Diagramas de Componentes

Referencia estructural estable. Actualizar solo si cambia la topología del sistema.

## Contexto (alto nivel)

```mermaid
flowchart LR
    User(["👤 Usuario"])
    Ext["Chrome Extension\n(Popup MV3)"]
    BG["Background\nService Worker"]
    Supa["Supabase\nPostgreSQL + Auth"]
    Google["Google OAuth"]

    User -->|"click ícono"| Ext
    Ext -->|"messages"| BG
    Ext -->|"REST / realtime"| Supa
    Ext -->|"chrome.identity"| Google
    Google -->|"token"| Ext
    Ext -->|"setSession"| Supa
```

## Componentes del Popup

```mermaid
flowchart TB
    subgraph Popup["Popup (entrypoints/popup/)"]
        App["App.tsx\n(AuthGuard + Panel Router)"]

        subgraph Auth["Auth"]
            Login["LoginScreen"]
            useAuth["useAuth hook"]
        end

        subgraph Home["Panel: Home"]
            Rec["Recommendation"]
            Status["DailyStatus"]
            Logger["SleepLogger"]
            DayCtx["DayContextCapture"]
            useSL["useSleepLog"]
            useSG["useSleepGoal"]
            useDC["useDayContext"]
        end

        subgraph History["Panel: History"]
            Chart["SleepHistoryChart"]
            Stats["SleepStats"]
        end

        subgraph Insights["Panel: Insights"]
            InsP["InsightsPanel\n(scatter + breakdowns + cruce)"]
        end

        subgraph Settings["Panel: Settings"]
            GoalForm["SleepGoalForm"]
        end

        Nav["BottomNav"]
    end

    subgraph Lib["src/lib/"]
        Supabase["supabase.ts\n(client singleton)"]
        Types["types.ts"]
        Sleep["sleep.ts\n(pure functions)"]
        Insights2["insights.ts\n(collapseNights + breakdowns)"]
    end

    subgraph Hooks["src/hooks/"]
        useStorage["useStorage\n(chrome.storage.local)"]
    end

    App --> Login
    App --> Nav
    App --> Home
    App --> History
    App --> Insights
    App --> Settings

    Logger --> DayCtx
    useAuth --> Supabase
    useSL --> Supabase
    useSG --> Supabase
    useDC --> Supabase
    useAuth -->|"browser.storage.local"| storage[("chrome.storage\n.local")]
    Rec --> Sleep
    Stats --> Sleep
    InsP --> Insights2
    Insights2 --> Sleep
```

## Flujo de Datos — Sleep Log

```mermaid
flowchart LR
    Btn["Botón\n'Voy a dormir'"]
    Hook["useSleepLog\n.logBedtime()"]
    DB[("Supabase\nsleep_logs")]
    Status["DailyStatus\n(re-render)"]
    Rec["Recommendation\n(recalcula)"]

    Btn --> Hook
    Hook -->|"INSERT / UPDATE"| DB
    DB -->|"refresh"| Status
    DB -->|"getRecentLogs"| Rec
```
