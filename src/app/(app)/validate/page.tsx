import ValidatePanel from "@/components/ValidatePanel";

export default function ValidatePage() {
  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Validate Voucher</h1>
          <p>Enter a voucher code or customer mobile number to check and redeem.</p>
        </div>
      </div>
      <ValidatePanel />
    </div>
  );
}
