import React from 'react';
import ReactDOM from 'react-dom';
import LayoutManager from '../LayoutManager';

/**
 * Far from cryptographically secure, but good enough to avoid component naming collisions.
 */
function randomString() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function translateConfig(config, configMap) {
  if (config.component) {
    const componentName = `${(config.component.key || config.component.name)}_${randomString()}`;
    configMap[componentName] = config.component;

    return {
      ...config,
      type: 'react-component',
      component: componentName,
    };
  }

  return {
    ...config,
    content: config.content.map(item => translateConfig(item, configMap))
  };
}

export default class ReactLayoutComponent extends React.Component {
  containerRef = React.createRef();

  constructor(props) {
    super(props);

    const componentMap = {};
    const glConfig = translateConfig(this.props.config || {}, componentMap);

    this.state = {
      renderPanels: new Set(),
      config: this.props.config,
      glConfig,
      componentMap
    };
  }

  /**
   * Called by ReactComponentHandler on GoldenLayout's render component call.
   * @param {ReactComponentHandler} reactComponentHandler 
   */
  componentRender(reactComponentHandler) {
    this.setState(state => {
      let newRenderPanels = new Set(state.renderPanels);
      newRenderPanels.add(reactComponentHandler);
      return { renderPanels: newRenderPanels };
    });
  }

  /**
   * Called by ReactComponentHandler on GoldenLayout's destroy component call.
   * @param {ReactComponentHandler} reactComponentHandler 
   */
  componentDestroy(reactComponentHandler) {
    this.setState(state => {
      let newRenderPanels = new Set(state.renderPanels);
      newRenderPanels.delete(reactComponentHandler);
      return { renderPanels: newRenderPanels };
    });
  }

  goldenLayoutInstance = undefined;

  componentDidMount() {
    this.goldenLayoutInstance = new LayoutManager(
      this.state.glConfig || {},
      this.containerRef.current
    );

    for (let component in this.state.componentMap) {
      this.goldenLayoutInstance.registerComponent(component, this.state.componentMap[component]);
    }

    this.goldenLayoutInstance.reactContainer = this;
    this.goldenLayoutInstance.init();
  }

  render() {
    let panels = Array.from(this.state.renderPanels || []);

    return (
      <div ref={this.containerRef} {...this.props.htmlAttrs}>
        {panels.map((panel, index) => {
          return ReactDOM.createPortal(
            panel._getReactComponent(),
            panel._container.getElement()[0]
          );
        })}
      </div>
    );
  }
}
