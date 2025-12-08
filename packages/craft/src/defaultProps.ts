import { mapValues, without } from 'lodash-es'

export const commonDefaultProps = {
  // actions
  actionType: '',
  url: '',

  // size
  height: '',
  width: '318px',
  paddingLeft: '0px',
  paddingRight: '0px',
  paddingTop: '0px',
  paddingBottom: '0px',

  // border type
  borderStyle: 'none',
  borderColor: '#000',
  borderWidth: '0',
  borderRadius: '0',

  // shadow and opacity
  boxShadow: '0 0 0 #000000',
  opacity: 1,

  // position and x,y
  position: 'absolute',
  left: '0',
  top: '0',
  right: '0',
}

export const textDefaultProps = {
  ...commonDefaultProps,

  text: '正文内容',

  // basic props - font styles
  fontSize: '14px',
  fontFamily: '',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  lineHeight: '1',
  textAlign: 'left',
  color: '#000000',
  backgroundColor: '',
}

//源码 transformToComponentProps
export const computePropTypes = <T extends Record<string, any>>(props: T) =>
  mapValues(props, item => {
    return {
      type: item.constructor,
      default: item,
    }
  })

export const textPropType = computePropTypes(textDefaultProps)

export const textStylePropsKeys = without(Object.keys(textDefaultProps), 'actionType', 'url', 'text')
