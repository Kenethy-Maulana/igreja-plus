import { QRCodeCanvas } from 'qrcode.react'

function MemberQRCode({ memberId }) {

  return (
    <div className="bg-white p-2 rounded-xl flex justify-center">

      <QRCodeCanvas
        value={String(memberId)}
        size={120}
      />

    </div>
  )
}

export default MemberQRCode