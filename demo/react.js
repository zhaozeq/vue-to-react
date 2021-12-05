import React, { Component } from "react";
import ToDo from "./todo";
import "./your.less";
export default class TestSfc extends Component {
  constructor(props) {
    super(props);

    const now = Date.now();
    this.state = {
      list: [1, 2, 3],
      html: "<div>1111<span>222</span>333<p>ssssss</p></div>",
      error: false,
      checked: false,
      time: now
    };
  }
  static defaultProps = { msg: "hello, sfc" };
  clickMethod = () => {
    console.log("click method");
  };
  testMethod = () => {
    console.log("call test");
  };
  render() {
    const test = () => {
      console.log("from computed", this.props.msg);
      return `${this.state.time}: ${this.state.html}`;
    };
    return (
      <div className="wrap">
        <div calss="wrap-tit">time: {this.state.time}</div>
        {this.state.error ? (
          <p>some error happend</p>
        ) : (
          <p className="name">your msg: {this.props.msg}</p>
        )}
        {this.props.msg && <p className="shown">test v-show</p>}
        <p onClick={this.clickMethod}>test v-on</p>
        <img src={this.props.imageSrc}></img>
        <ul className="test-list">
          {this.state.list.map((value, index) => (
            <li className="list-item" key={index}>
              <div>{value}</div>
              <span>{this.props.msg}</span>
            </li>
          ))}
        </ul>
        <input
          value={this.state.text}
          onInput={e => this.setState({ text: e.target.value })}
        ></input>
        <input
          type="checkbox"
          value={this.state.checked}
          onInput={e => this.setState({ checked: e.target.checked })}
        ></input>
        <span>{this.props.text}</span>
        <div dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
        <ToDo msg={this.props.msg} list={this.state.list}></ToDo>
        {this.props.msg}
      </div>
    );
  }
}
