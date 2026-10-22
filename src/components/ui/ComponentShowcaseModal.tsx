import React, { useState } from "react";
import {
  Modal,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Checkbox,
  Input,
  Select,
  Textarea,
  Badge,
  Tabs,
} from "./index";
import {
  Sparkles,
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Check,
} from "lucide-react";

interface ComponentShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentShowcaseModal: React.FC<ComponentShowcaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<"buttons" | "cards" | "forms" | "checkboxes" | "badges">("buttons");
  const [btnLoading, setBtnLoading] = useState(false);
  const [sampleCheck1, setSampleCheck1] = useState(true);
  const [sampleCheck2, setSampleCheck2] = useState(false);
  const [sampleTaskCheck, setSampleTaskCheck] = useState(true);
  const [cardClickCount, setCardClickCount] = useState(0);
  const [sampleInputValue, setSampleInputValue] = useState("");
  const [sampleSelectValue, setSampleSelectValue] = useState("500g");

  const tabItems = [
    { id: "buttons" as const, label: "Knappar" },
    { id: "cards" as const, label: "Kort & Paneler" },
    { id: "checkboxes" as const, label: "Kryssrutor" },
    { id: "forms" as const, label: "Formulärfält" },
    { id: "badges" as const, label: "Statusmärken" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="UI Komponentbibliotek"
      subtitle="Översikt över appens standardiserade visuella komponenter & tokens"
      maxWidth={680}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Stäng
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Navigation Tabs */}
        <Tabs items={tabItems} activeId={activeSection} onChange={setActiveSection} />

        {/* 1. BUTTONS */}
        {activeSection === "buttons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                Varianter (Design- & Färgpalett)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <Button variant="primary" leftIcon={<Plus size={16} />}>
                  Primär
                </Button>
                <Button variant="secondary">Sekundär</Button>
                <Button variant="outline">Kontur</Button>
                <Button variant="honey" leftIcon={<ShoppingBag size={16} />}>
                  Sälj honung
                </Button>
                <Button variant="danger" leftIcon={<Trash2 size={16} />}>
                  Radera
                </Button>
                <Button variant="ghost">Spöke</Button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                Storlekar
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <Button variant="primary" size="sm">
                  Liten (sm)
                </Button>
                <Button variant="primary" size="md">
                  Standard (md)
                </Button>
                <Button variant="primary" size="lg">
                  Stor (lg)
                </Button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                Tillstånd (Laddning & Inaktiverad)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <Button
                  variant="primary"
                  loading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 2000);
                  }}
                >
                  {btnLoading ? "Sparar..." : "Klicka för laddning"}
                </Button>
                <Button variant="honey" loading={btnLoading}>
                  Honungsknapp laddar
                </Button>
                <Button variant="secondary" disabled>
                  Inaktiverad
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. CARDS */}
        {activeSection === "cards" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Card variant="default">
              <CardHeader
                action={
                  <Badge variant="success" size="sm">
                    Aktiv
                  </Badge>
                }
              >
                <CardTitle size="md">Standard Kort (Card)</CardTitle>
                <CardDescription>Container med harmoniserad padding och semantisk ram</CardDescription>
              </CardHeader>
              <CardContent>
                Det här är standardkortet som används för kupor, sammanfattningar och paneler. Det
                följer systemets ljust/mörkt läge med rätt kontrast.
              </CardContent>
              <CardFooter>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Uppdaterad nyss
                </span>
                <Button variant="ghost" size="sm">
                  Detaljer
                </Button>
              </CardFooter>
            </Card>

            <Card
              variant="interactive"
              onClick={() => setCardClickCount((c) => c + 1)}
              style={{ cursor: "pointer" }}
            >
              <CardHeader>
                <CardTitle size="sm">Klickbart Kort (Interactive)</CardTitle>
                <CardDescription>Hover-effekt och tangentbordsnavigering</CardDescription>
              </CardHeader>
              <CardContent>
                Klickat: <strong>{cardClickCount}</strong> gånger.
              </CardContent>
            </Card>

            <Card variant="subtle" padding="sm">
              <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <strong>Subtilt Inbäddat Kort (Subtle)</strong>: Används för bakgrundssektioner och
                sammanfattningslådor.
              </span>
            </Card>
          </div>
        )}

        {/* 3. CHECKBOXES */}
        {activeSection === "checkboxes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Card variant="default">
              <CardHeader>
                <CardTitle size="sm">Kryssrutor & Handsktouchanpassning</CardTitle>
                <CardDescription>
                  Inga vita rutor i mörkt läge, skarp bock och WCAG-kontrast
                </CardDescription>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <Checkbox
                  label="Standard kryssruta (18px)"
                  description="För standardformulär och inställningsval"
                  checked={sampleCheck1}
                  onChange={(e) => setSampleCheck1(e.target.checked)}
                />

                <Checkbox
                  size="large"
                  label="Uppgiftskryssruta (22px handsktouch)"
                  description="Optimerad för bigård med handskar eller fuktiga fingrar"
                  checked={sampleTaskCheck}
                  onChange={(e) => setSampleTaskCheck(e.target.checked)}
                />

                <Checkbox
                  label="Omarkerad kryssruta"
                  checked={sampleCheck2}
                  onChange={(e) => setSampleCheck2(e.target.checked)}
                />

                <Checkbox
                  label="Inaktiverat val"
                  description="Kryssruta som inte kan ändras"
                  disabled
                  checked={true}
                />

                <Checkbox
                  label="Valideringsfel"
                  error="Detta val kräver din bekräftelse"
                  checked={false}
                  onChange={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. FORMS */}
        {activeSection === "forms" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              label="Standard Textfält"
              placeholder="t.ex. Kupa 1 - Drottning Saga"
              value={sampleInputValue}
              onChange={(e) => setSampleInputValue(e.target.value)}
              helperText="Hjälptext för att vägleda användaren"
            />

            <Input
              label="Sökfält med ikon"
              leftIcon={<Search size={16} />}
              placeholder="Sök bland kupor och skördar..."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Input
                label="Pris per burk"
                rightAddon="kr"
                type="number"
                defaultValue={95}
              />
              <Select
                label="Burkstorlek"
                value={sampleSelectValue}
                onChange={(e) => setSampleSelectValue(e.target.value)}
                options={[
                  { value: "250g", label: "250 gram" },
                  { value: "500g", label: "500 gram (Standard)" },
                  { value: "700g", label: "700 gram" },
                ]}
              />
            </div>

            <Input
              label="Fält med felmeddelande"
              defaultValue="felaktigt värde"
              error="Beloppet måste vara ett positivt tal"
            />

            <Textarea
              label="Anteckning / Beskrivning"
              placeholder="Skriv eventuella detaljer här..."
              rows={3}
            />
          </div>
        )}

        {/* 5. BADGES */}
        {activeSection === "badges" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                Semantiska Statusmärken (WCAG-anpassade)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                  Aktiv / Slutförd
                </Badge>
                <Badge variant="warning" icon={<Clock size={12} />}>
                  Åtgärd krävs
                </Badge>
                <Badge variant="danger" icon={<AlertCircle size={12} />}>
                  Inaktiv / Varning
                </Badge>
                <Badge variant="honey" icon={<Sparkles size={12} />}>
                  Skörd / Honung
                </Badge>
                <Badge variant="primary" icon={<Layers size={12} />}>
                  Kupsamhälle
                </Badge>
                <Badge variant="neutral">Neutral / Arkiverad</Badge>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "0.5rem" }}>
                Kompakt storlek (sm)
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <Badge variant="success" size="sm">
                  Slutförd
                </Badge>
                <Badge variant="honey" size="sm">
                  500g
                </Badge>
                <Badge variant="neutral" size="sm">
                  Kupa A
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
