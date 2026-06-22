'use client'

export default function SuspensaoPage() {
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⏸️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso temporariamente suspenso</h1>
        <p className="text-gray-500 text-sm mb-6">
          Identificamos uma mensalidade em aberto. Assim que o pagamento for confirmado, seu acesso
          será reativado automaticamente.
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-left mb-6">
          <p className="font-semibold text-orange-700 mb-1">Como regularizar:</p>
          <ol className="text-gray-600 space-y-1 list-decimal list-inside">
            <li>Verifique o boleto/Pix no seu e-mail</li>
            <li>Efetue o pagamento</li>
            <li>Aguarde até 2 minutos para o acesso ser reativado</li>
          </ol>
        </div>
        <a
          href="mailto:contato@rotasimples.com.br"
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition mb-3"
        >
          Falar com o suporte
        </a>
        <button
          onClick={() => window.location.reload()}
          className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 py-3 rounded-xl text-sm transition"
        >
          Já paguei — verificar novamente
        </button>
      </div>
    </div>
  )
}
