import { useSyncExternalStore, useState, useRef, useMemo, useEffect, useId } from 'react'
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import {
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconCheckOutline16,
  IconWarningOutline16,
  Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ModelProviderGroup, ModelSelection } from './types.d'

/** Class-name map produced by the esbuild CSS loader (injected via data-plugin-css). */
const css: Record<string, string> = {
  root: '_mpl_root',
  trigger: '_mpl_trigger',
  triggerLabel: '_mpl_triggerLabel',
  triggerProvider: '_mpl_triggerProvider',
  triggerEffort: '_mpl_triggerEffort',
  chevron: '_mpl_chevron',
  chevronOpen: '_mpl_chevronOpen',
  menu: '_mpl_menu',
  status: '_mpl_status',
  empty: '_mpl_empty',
  error: '_mpl_error',
  warning: '_mpl_warning',
  retry: '_mpl_retry',
  groups: '_mpl_groups',
  group: '_mpl_group',
  groupTitle: '_mpl_groupTitle',
  option: '_mpl_option',
  selected: '_mpl_selected',
  optionCopy: '_mpl_optionCopy',
  modelName: '_mpl_modelName',
  description: '_mpl_description',
  check: '_mpl_check',
  cell: '_mpl_cell',
  cellLabel: '_mpl_cellLabel',
  cellValue: '_mpl_cellValue',
  cellChevron: '_mpl_cellChevron',
}

function clsx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ')
}

type DirectoryFace = {
  getSnapshot(): any
  subscribe(fn: () => void): () => void
}
type ModelSelectProps = {
  locked: boolean
  available: boolean
  directory: DirectoryFace
  load: () => void
  select: (selection: ModelSelection) => Promise<boolean>
  t: (key: string, params?: Record<string, string>) => string
}

function ModelSelect({ locked, available, directory, load, select, t }: ModelSelectProps) {
  const state = useSyncExternalStore((fn) => directory.subscribe(fn), () => directory.getSnapshot())
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'model' | 'effort'>('root')
  const lastActionRef = useRef<'load' | 'select'>('load')
  const [toast, setToast] = useState<{ seq: number; text: string } | null>(null)
  const toastSeq = useRef(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const id = useId()

  const choices = useMemo(
    () =>
      (state.groups as ModelProviderGroup[]).flatMap((group) =>
        group.models.map((model) => ({
          group,
          model,
          selection: {
            provider: group.id,
            model: model.id,
            ...(model.reasoning?.defaultEffort === undefined ? {} : { reasoningEffort: model.reasoning.defaultEffort }),
          },
        })),
      ),
    [state.groups],
  )
  const currentChoice =
    choices[
      state.current === null
        ? -1
        : choices.findIndex(
            (c) => c.selection.provider === state.current?.provider && c.selection.model === state.current.model,
          )
    ]
  const reasoning = currentChoice?.model.reasoning
  const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort
  const effortLabel =
    reasoning === undefined
      ? undefined
      : effectiveEffort === undefined
        ? t('effort.providerDefault')
        : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort
  const effortChoices = useMemo(
    () =>
      reasoning === undefined
        ? []
        : [
            ...(reasoning.defaultEffort === undefined
              ? [{ key: 'provider-default', effort: undefined as string | undefined, label: t('effort.providerDefault') }]
              : []),
            ...reasoning.efforts.map((effort) => ({
              key: `effort:${effort.id}`,
              effort: effort.id,
              label: effort.name,
              ...(effort.description === undefined ? {} : { description: effort.description }),
            })),
          ],
    [reasoning, t],
  )
  const busy = state.status === 'selecting'
  const reload = () => {
    lastActionRef.current = 'load'
    load()
  }

  useEffect(() => {
    if (available) {
      lastActionRef.current = 'load'
      load()
    }
  }, [available, load])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
    }
  }, [open])

  if (!available) return null

  const show = () => {
    setPane('root')
    setOpen(true)
    reload()
  }
  const close = (restoreFocus = false) => {
    setOpen(false)
    setPane('root')
    if (restoreFocus)
      queueMicrotask(() => {
        triggerRef.current?.focus()
      })
  }
  const moveFocus = (offset: number) => {
    const items = itemRefs.current.filter((item) => item !== null)
    if (items.length === 0) return
    const active = items.findIndex((item) => item === document.activeElement)
    items[(Math.max(active, 0) + offset + items.length) % items.length]?.focus()
  }
  const onRootKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      if (pane !== 'root') setPane('root')
      else close(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    }
  }
  const onBlur = (event: React.FocusEvent) => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
    close()
  }
  const settleSelection = (accepted: boolean) => {
    if (accepted) {
      if (rootRef.current !== null) close(true)
      return
    }
    const message = directory.getSnapshot().error
    if (message !== null) {
      toastSeq.current += 1
      setToast({ seq: toastSeq.current, text: t('error.action', { message }) })
    }
  }
  const choose = (selection: ModelSelection) => {
    if (state.current?.provider === selection.provider && state.current.model === selection.model) {
      close(true)
      return
    }
    lastActionRef.current = 'select'
    select(selection).then(settleSelection)
  }
  const chooseEffort = (effort: string | undefined) => {
    if (state.current === null) return
    if (effectiveEffort === effort) {
      close(true)
      return
    }
    const selection = {
      provider: state.current.provider,
      model: state.current.model,
      ...(effort === undefined ? {} : { reasoningEffort: effort }),
    }
    lastActionRef.current = 'select'
    select(selection).then(settleSelection)
  }

  // ★ 核心改动：trigger 同时显示 provider displayName 与模型名
  const providerLabel = currentChoice?.group.name
  const modelLabel = currentChoice?.model.name ?? t('trigger.fallback')
  const triggerLabel =
    providerLabel === undefined
      ? modelLabel
      : effortLabel === undefined
        ? `${providerLabel} · ${modelLabel}`
        : `${providerLabel} · ${modelLabel} · ${effortLabel}`
  const triggerAria =
    currentChoice === undefined
      ? t('trigger.selectAria')
      : effortLabel === undefined
        ? t('trigger.aria', { model: modelLabel })
        : t('trigger.ariaEffort', { model: modelLabel, effort: effortLabel })

  itemRefs.current = []
  let itemIndex = 0
  const itemRef = () => {
    const at = itemIndex++
    return (node: HTMLElement | null) => {
      itemRefs.current[at] = node
    }
  }

  return (
    <div ref={rootRef} className={css.root} onKeyDown={onRootKeyDown} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-label={triggerAria}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        title={triggerLabel}
        disabled={locked}
        onClick={() => {
          if (open) close()
          else show()
        }}
      >
        {providerLabel !== undefined && (
          <span className={css.triggerProvider}>{providerLabel}</span>
        )}
        <span className={css.triggerLabel}>{modelLabel}</span>
        {effortLabel !== undefined && <span className={css.triggerEffort}>{effortLabel}</span>}
        <IconChevronDownOutline14 className={clsx(css.chevron, open && css.chevronOpen)} />
      </button>

      {open && (
        <div id={`${id}-menu`} className={css.menu} role="menu" aria-label={t('menu.aria')}>
          {state.status === 'loading' && <div className={css.status}>{t('status.loading')}</div>}
          {lastActionRef.current === 'load' && state.error !== null && (
            <div className={css.error}>
              <span>{state.error}</span>
              <button type="button" className={css.retry} onClick={reload}>
                {t('action.reload')}
              </button>
            </div>
          )}
          {(state.failures ?? []).map((failure) => (
            <div key={failure.id} className={css.warning}>
              <span>{t('warning.groupLoad', { name: failure.name, message: failure.message })}</span>
              <button type="button" className={css.retry} onClick={reload}>
                {t('action.reload')}
              </button>
            </div>
          ))}

          {pane === 'root' && (
            <>
              <button
                type="button"
                className={css.cell}
                ref={itemRef()}
                disabled={busy}
                onClick={() => setPane('model')}
              >
                <span className={css.cellLabel}>{t('menu.model')}</span>
                <span className={css.cellValue}>{modelLabel}</span>
                <IconChevronRightOutline14 className={css.cellChevron} />
              </button>
              <button
                type="button"
                className={css.cell}
                ref={itemRef()}
                disabled={busy || reasoning === undefined}
                onClick={() => setPane('effort')}
              >
                <span className={css.cellLabel}>{t('menu.effort')}</span>
                <span className={css.cellValue}>{effortLabel ?? t('effort.providerDefault')}</span>
                <IconChevronRightOutline14 className={css.cellChevron} />
              </button>
            </>
          )}

          {pane === 'model' && (
            <div className={clsx(css.groups, 'scrollable')}>
              {state.groups.map((group) => {
                const headingId = `${id}-${group.id}`
                return (
                  <div key={group.id} className={css.group}>
                    <div id={headingId} className={css.groupTitle}>
                      {group.name}
                    </div>
                    {group.models.map((model) => {
                      const selected =
                        state.current?.provider === group.id && state.current.model === model.id
                      return (
                        <button
                          key={model.id}
                          type="button"
                          ref={itemRef()}
                          role="menuitemradio"
                          aria-checked={selected}
                          aria-labelledby={headingId}
                          className={clsx(css.option, selected && css.selected)}
                          disabled={busy}
                          onClick={() =>
                            choose({
                              provider: group.id,
                              model: model.id,
                              ...(model.reasoning?.defaultEffort === undefined
                                ? {}
                                : { reasoningEffort: model.reasoning.defaultEffort }),
                            })
                          }
                        >
                          <span className={css.optionCopy}>
                            <span className={css.modelName}>{model.name}</span>
                            {model.description !== undefined && (
                              <span className={css.description}>
                                {`${group.name} · ${model.description}`}
                              </span>
                            )}
                          </span>
                          <span className={css.check}>{selected ? <IconCheckOutline16 /> : null}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
              {state.groups.length === 0 && (
                <div className={css.empty}>
                  {state.status === 'error' ? state.error : t('empty.models')}
                </div>
              )}
            </div>
          )}

          {pane === 'effort' && (
            <div className={clsx(css.groups, 'scrollable')}>
              {effortChoices.length === 0 && <div className={css.empty}>{t('empty.efforts')}</div>}
              {effortChoices.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  ref={itemRef()}
                  role="menuitemradio"
                  aria-checked={effectiveEffort === level.effort}
                  className={clsx(css.option, effectiveEffort === level.effort && css.selected)}
                  disabled={busy}
                  onClick={() => chooseEffort(level.effort)}
                >
                  <span className={css.optionCopy}>
                    <span className={css.modelName}>{level.label}</span>
                    {level.description !== undefined && (
                      <span className={css.description}>{level.description}</span>
                    )}
                  </span>
                  <span className={css.check}>
                    {effectiveEffort === level.effort ? <IconCheckOutline16 /> : null}
                  </span>
                </button>
              ))}
            </div>
          )}

          {toast !== null && (
            <Toast
              text={toast.text}
              icon={<IconWarningOutline16 />}
              anchor={rootRef.current?.closest('[data-composer-card]') ?? null}
              onDone={() => setToast(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ModelSelect
