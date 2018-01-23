import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

const style = css`
  text-align: center;
  padding: 8px;
  cursor: pointer;
  font-size: 24px;
  color: white;

  :hover {
    background-color: #424242;
  }
`;

const Item = styled.div`
  ${style};
`;

const LinkItem = styled(Link)`
  display: block;
  text-decoration: none;
  ${style};
`;

export default Item;
export { LinkItem };
