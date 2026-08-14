import ModelSelect from './ModelSelect.tsx'

/** The `model` locale namespace is registered by the stock
 * dsh-client-ui-model-selection plugin; we reuse it for the same keys. */
const NS = 'model'

/** Required services: slots (to shadow the composer seat) plus the sessions
 * face needed to build the inject props. The default ui-model-selection plugin
 * owns `modelDirectories`; we inject it read-only to reuse per-session state. */
const inject = ['slots', 'sessions', 'modelDirectories']

/**
 * Client plugin body: shadow the `conversation.input.model` seat with a
 * ModelSelect that also shows the provider display name next to the model
 * name. The `model` locale namespace is owned by the stock
 * dsh-client-ui-model-selection plugin and is reused via the slot's
 * `locale` option (re-registering it would throw).
 */
function apply(ctx: any) {
  // Note: the `model` locale namespace is owned by the stock
  // dsh-client-ui-model-selection plugin; we must NOT re-register it
  // (the locale service throws on duplicates). The slot `locale: NS`
  // option below binds that namespace's translator for the component.

  ctx.inject(['slots', 'modelDirectories'], (scope: any) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    // priority -100 (lower than the default 0) shadows the stock ModelSelect.
    scope.slots.inject('conversation.input.model', () =>
      scope.slots.register(
        {
          name: 'conversation.input.model',
          locale: NS,
          priority: -100,
          inject: (sessionId: any) => {
            const directory = models.directoryFor(sessionId)
            const available = sessions.subagentAddress(sessionId) === undefined
            return {
              available,
              directory: directory.store,
              load: () => {
                if (available) directory.load().catch(() => {})
              },
              select: (selection: any) =>
                available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false),
            }
          },
        },
        ModelSelect,
      ),
    )
  })
}

export { apply, inject }
